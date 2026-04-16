import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useFirestore } from '../hooks/useFirestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, Circle, Plus, Trash2, Calendar as CalendarIcon, X, CalendarDays, Bell, List, LayoutGrid } from 'lucide-react';
import { format, isSameDay, startOfDay } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Card } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export const TasksView = () => {
  const { user } = useAuth();
  const { data: tasks } = useFirestore<any>('tasks');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [newTask, setNewTask] = useState<{ title: string; category: string; priority: string; dueDate: Date | undefined; reminderAt: string }>({ 
    title: '', 
    category: '', 
    priority: 'Medium',
    dueDate: undefined,
    reminderAt: ''
  });

  // Reminder Notification Logic
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      tasks.forEach((task: any) => {
        if (task.reminderAt && !task.completed) {
          const reminderTime = new Date(task.reminderAt);
          // If reminder is within the last minute and hasn't been dismissed (we could add a dismissed flag, but for now just check time)
          const diff = Math.abs(now.getTime() - reminderTime.getTime());
          if (diff < 60000) { // 1 minute window
            toast.info(`Reminder: ${task.title}`, {
              description: `Due: ${task.dueDate ? format(new Date(task.dueDate), 'PPP') : 'No due date'}`,
              icon: <Bell className="text-primary" size={16} />,
              duration: 10000,
            });
            
            // Browser Notification if permitted
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("Task Reminder", {
                body: task.title,
                icon: "/favicon.ico"
              });
            }
          }
        }
      });
    };

    // Request notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const interval = setInterval(checkReminders, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [tasks]);

  const addTask = async () => {
    if (!newTask.title || !user) return;
    try {
      await addDoc(collection(db, 'tasks'), {
        userId: user.uid,
        title: newTask.title,
        category: newTask.category || 'General',
        priority: newTask.priority,
        completed: false,
        dueDate: newTask.dueDate ? newTask.dueDate.toISOString() : null,
        reminderAt: newTask.reminderAt ? new Date(newTask.reminderAt).toISOString() : null,
        createdAt: new Date().toISOString()
      });
      setNewTask({ title: '', category: '', priority: 'Medium', dueDate: undefined, reminderAt: '' });
      setIsAddOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'tasks');
    }
  };

  const updateTask = async (id: string, updates: any) => {
    try {
      await updateDoc(doc(db, 'tasks', id), updates);
      setEditingTask(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'tasks');
    }
  };

  const toggleTask = async (task: any) => {
    try {
      await updateDoc(doc(db, 'tasks', task.id), {
        completed: !task.completed
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'tasks');
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'tasks');
    }
  };

  const PRIORITY_WEIGHT = { High: 3, Medium: 2, Low: 1 };

  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    
    const priorityA = PRIORITY_WEIGHT[a.priority as keyof typeof PRIORITY_WEIGHT] || 0;
    const priorityB = PRIORITY_WEIGHT[b.priority as keyof typeof PRIORITY_WEIGHT] || 0;
    
    if (priorityA !== priorityB) return priorityB - priorityA;
    
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-700 border-red-200';
      case 'Medium': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Low': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    }
  };

  return (
    <TaskContext.Provider value={{ toggleTask, setEditingTask, deleteTask, getPriorityColor, editingTask, updateTask }}>
      <div className="flex-1 flex flex-col h-full bg-background">
        <header className="p-4 lg:p-6 border-b border-border/50 flex justify-between items-center bg-background/80 backdrop-blur-md sticky top-0 z-10">
          <div className="max-w-5xl mx-auto w-full flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="space-y-0.5">
                <h1 className="text-2xl font-light tracking-tight text-foreground">Tasks</h1>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em]">
                  {sortedTasks.filter(t => !t.completed).length} items remaining
                </p>
              </div>
              <div className="flex bg-muted/50 p-1 rounded-lg ml-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "h-8 px-3 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all",
                    viewMode === 'list' ? "bg-background shadow-sm text-primary" : "text-muted-foreground"
                  )}
                >
                  <List size={14} className="mr-1.5" />
                  List
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setViewMode('calendar')}
                  className={cn(
                    "h-8 px-3 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all",
                    viewMode === 'calendar' ? "bg-background shadow-sm text-primary" : "text-muted-foreground"
                  )}
                >
                  <LayoutGrid size={14} className="mr-1.5" />
                  Calendar
                </Button>
              </div>
            </div>
            <Dialog open={isAddOpen} onOpenChange={(open) => {
              setIsAddOpen(open);
              if (open && viewMode === 'calendar' && selectedDate) {
                setNewTask(prev => ({ ...prev, dueDate: selectedDate }));
              }
            }}>
              <DialogTrigger render={
                <Button size="icon" className="w-10 h-10 rounded-lg bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95" />
              }>
                <Plus size={20} />
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] rounded-lg p-8 border-none shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-semibold tracking-tight">New Task</DialogTitle>
                  <DialogDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Add something to your list</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-6">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Task Title</Label>
                    <Input 
                      id="title" 
                      placeholder="What needs to be done?" 
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      className="h-12 rounded-md bg-muted/50 border-none focus-visible:ring-primary/20"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Category</Label>
                      <Input 
                        id="category" 
                        placeholder="e.g. Work" 
                        value={newTask.category}
                        onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                        className="h-12 rounded-md bg-muted/50 border-none focus-visible:ring-primary/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priority" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Priority</Label>
                      <Select 
                        value={newTask.priority} 
                        onValueChange={(value) => setNewTask({ ...newTask, priority: value })}
                      >
                        <SelectTrigger id="priority" className="h-12 rounded-md bg-muted/50 border-none focus:ring-primary/20">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent className="rounded-lg border-border/50">
                          <SelectItem value="High" className="rounded-md">High</SelectItem>
                          <SelectItem value="Medium" className="rounded-md">Medium</SelectItem>
                          <SelectItem value="Low" className="rounded-md">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Due Date</Label>
                    <Popover>
                      <PopoverTrigger render={
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full justify-start text-left font-medium h-12 rounded-md bg-muted/50 border-none hover:bg-muted/70 transition-colors",
                            !newTask.dueDate && "text-muted-foreground"
                          )}
                        />
                      }>
                        <CalendarDays className="mr-2 h-4 w-4 opacity-50" />
                        {newTask.dueDate ? format(newTask.dueDate, "PPP") : <span>Pick a date</span>}
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 rounded-lg border-none shadow-2xl" align="start">
                        <Calendar
                          mode="single"
                          selected={newTask.dueDate}
                          onSelect={(date) => setNewTask({ ...newTask, dueDate: date })}
                          initialFocus
                          className="rounded-lg"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reminder" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Reminder Time</Label>
                    <Input 
                      id="reminder" 
                      type="datetime-local" 
                      value={newTask.reminderAt}
                      onChange={(e) => setNewTask({ ...newTask, reminderAt: e.target.value })}
                      className="h-12 rounded-md bg-muted/50 border-none focus-visible:ring-primary/20"
                    />
                  </div>
                  <Button onClick={addTask} className="w-full h-14 rounded-lg bg-primary text-primary-foreground font-bold uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all">Create Task</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <ScrollArea className="flex-1 pb-20">
          <div className="max-w-5xl mx-auto p-4 lg:p-6 space-y-2">
            {viewMode === 'calendar' ? (
              <div className="space-y-6">
                <Card className="p-4 border-border/50 bg-card shadow-sm rounded-lg">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-lg w-full"
                    modifiers={{
                      hasTask: (date) => tasks.some((t: any) => t.dueDate && isSameDay(new Date(t.dueDate), date))
                    }}
                    modifiersClassNames={{
                      hasTask: "after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-primary after:rounded-full"
                    }}
                  />
                </Card>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                      Tasks for {selectedDate ? format(selectedDate, 'MMMM d') : 'Selected Date'}
                    </h3>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setIsAddOpen(true)}
                      className="h-7 px-2 text-[9px] font-bold uppercase tracking-wider text-primary hover:bg-primary/5"
                    >
                      <Plus size={12} className="mr-1" />
                      Quick Add
                    </Button>
                  </div>
                  
                  <AnimatePresence mode="popLayout">
                    {sortedTasks
                      .filter(task => selectedDate && task.dueDate && isSameDay(new Date(task.dueDate), selectedDate))
                      .map((task) => (
                        <TaskItem key={task.id} task={task} />
                      ))}
                  </AnimatePresence>
                  
                  {sortedTasks.filter(task => selectedDate && task.dueDate && isSameDay(new Date(task.dueDate), selectedDate)).length === 0 && (
                    <div className="py-12 text-center bg-muted/10 rounded-lg border border-dashed border-border/50">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">No tasks for this day</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {sortedTasks.map((task) => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </AnimatePresence>
            )}
            
            {tasks.length === 0 && viewMode === 'list' && (
              <div className="flex flex-col items-center justify-center py-20 bg-muted/10 rounded-lg border border-dashed border-border/50">
                <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <CheckCircle2 size={32} className="text-muted-foreground/20" />
                </div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground/40">All caught up!</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </TaskContext.Provider>
  );
};

// Extracted TaskItem component for reuse
const TaskItem = ({ task }: { task: any }) => {
  const { toggleTask, setEditingTask, deleteTask, getPriorityColor, editingTask, updateTask } = React.useContext(TaskContext);
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        scale: task.completed ? 0.99 : 1,
      }}
      whileHover={{ scale: task.completed ? 0.99 : 1.005 }}
      whileTap={{ scale: 0.98 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "group flex items-center gap-3 p-3 rounded-lg border transition-all duration-300",
        task.completed 
          ? "bg-muted/30 border-transparent opacity-60" 
          : "bg-card border-border/50 shadow-sm hover:shadow-md hover:border-primary/20"
      )}
    >
      <button 
        onClick={() => toggleTask(task)} 
        className="relative flex items-center justify-center w-5 h-5 rounded-full transition-all"
      >
        <AnimatePresence mode="wait">
          {task.completed ? (
            <motion.div
              key="completed"
              initial={{ scale: 0.5, opacity: 0, rotate: -20 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
            >
              <CheckCircle2 className="text-primary" size={20} />
            </motion.div>
          ) : (
            <motion.div
              key="pending"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="w-5 h-5 rounded-full border-2 border-muted-foreground/20 group-hover:border-primary/40 transition-colors"
            />
          )}
        </AnimatePresence>
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <p className={cn(
              "text-base font-semibold truncate transition-all",
              task.completed && "line-through text-muted-foreground font-medium"
            )}>
              {task.title}
            </p>
            {task.priority && (
              <span className={cn(
                "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border",
                getPriorityColor(task.priority),
                task.completed && "opacity-50 grayscale"
              )}>
                {task.priority}
              </span>
            )}
          </div>
          {task.dueDate && (
            <span className={cn(
              "text-[9px] font-bold whitespace-nowrap px-2 py-0.5 rounded-md uppercase tracking-wider",
              task.completed ? "text-muted-foreground/40 bg-muted/30" : "text-muted-foreground bg-muted/50"
            )}>
              {format(new Date(task.dueDate), 'MMM d')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.15em] bg-muted/50 px-1.5 py-0.5 rounded-md">
            {task.category}
          </span>
          {task.reminderAt && (
            <span className="text-[8px] font-black text-primary/60 uppercase tracking-[0.15em] bg-primary/5 px-1.5 py-0.5 rounded-md flex items-center gap-1">
              <Bell size={8} className="opacity-60" />
              {format(new Date(task.reminderAt), 'MMM d, p')}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Dialog open={!!editingTask && editingTask.id === task.id} onOpenChange={(open) => !open && setEditingTask(null)}>
          <DialogTrigger render={
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setEditingTask(task)}
              className="w-8 h-8 rounded-md text-muted-foreground/40 hover:text-primary hover:bg-primary/5"
            />
          }>
            <CalendarIcon size={16} />
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-lg p-8 border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-semibold tracking-tight">Edit Task</DialogTitle>
              <DialogDescription className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Update your details</DialogDescription>
            </DialogHeader>
            {editingTask && (
              <div className="space-y-6 py-6">
                <div className="space-y-2">
                  <Label htmlFor="edit-title" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Task Title</Label>
                  <Input 
                    id="edit-title" 
                    value={editingTask.title}
                    onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                    className="h-12 rounded-md bg-muted/50 border-none focus-visible:ring-primary/20"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-category" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Category</Label>
                    <Input 
                      id="edit-category" 
                      value={editingTask.category}
                      onChange={(e) => setEditingTask({ ...editingTask, category: e.target.value })}
                      className="h-12 rounded-md bg-muted/50 border-none focus-visible:ring-primary/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-priority" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Priority</Label>
                    <Select 
                      value={editingTask.priority} 
                      onValueChange={(value) => setEditingTask({ ...editingTask, priority: value })}
                    >
                      <SelectTrigger id="edit-priority" className="h-12 rounded-md bg-muted/50 border-none focus:ring-primary/20">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent className="rounded-lg border-border/50">
                        <SelectItem value="High" className="rounded-md">High</SelectItem>
                        <SelectItem value="Medium" className="rounded-md">Medium</SelectItem>
                        <SelectItem value="Low" className="rounded-md">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Due Date</Label>
                  <Popover>
                    <PopoverTrigger render={
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-medium h-12 rounded-md bg-muted/50 border-none hover:bg-muted/70 transition-colors",
                          !editingTask.dueDate && "text-muted-foreground"
                        )}
                      />
                    }>
                      <CalendarDays className="mr-2 h-4 w-4 opacity-50" />
                      {editingTask.dueDate ? format(new Date(editingTask.dueDate), "PPP") : <span>Pick a date</span>}
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-lg border-none shadow-2xl" align="start">
                      <Calendar
                        mode="single"
                        selected={editingTask.dueDate ? new Date(editingTask.dueDate) : undefined}
                        onSelect={(date) => setEditingTask({ ...editingTask, dueDate: date?.toISOString() })}
                        initialFocus
                        className="rounded-lg"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-reminder" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Reminder Time</Label>
                  <Input 
                    id="edit-reminder" 
                    type="datetime-local" 
                    value={editingTask.reminderAt ? format(new Date(editingTask.reminderAt), "yyyy-MM-dd'T'HH:mm") : ''}
                    onChange={(e) => setEditingTask({ ...editingTask, reminderAt: e.target.value })}
                    className="h-12 rounded-md bg-muted/50 border-none focus-visible:ring-primary/20"
                  />
                </div>
                <Button 
                  onClick={() => updateTask(editingTask.id, {
                    title: editingTask.title,
                    category: editingTask.category,
                    priority: editingTask.priority,
                    dueDate: editingTask.dueDate,
                    reminderAt: editingTask.reminderAt ? new Date(editingTask.reminderAt).toISOString() : null
                  })} 
                  className="w-full h-14 rounded-lg bg-primary text-primary-foreground font-bold uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Save Changes
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
        <AlertDialog>
          <AlertDialogTrigger render={
            <Button 
              variant="ghost" 
              size="icon"
              className="w-8 h-8 rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-destructive/5"
            />
          }>
            <Trash2 size={16} />
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-lg p-8 border-none shadow-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-2xl font-semibold tracking-tight">Delete Task?</AlertDialogTitle>
              <AlertDialogDescription className="text-sm font-medium text-muted-foreground">
                Are you sure you want to delete "{task.title}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-6 gap-3">
              <AlertDialogCancel className="rounded-md border-none bg-muted hover:bg-muted/80 font-bold uppercase tracking-widest text-[10px] h-12">Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => deleteTask(task.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md font-bold uppercase tracking-widest text-[10px] h-12"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </motion.div>
  );
};

// Create a context to avoid prop drilling
const TaskContext = React.createContext<any>(null);


// Helper for conditional classes
// (Removed local cn as it is now imported from @/lib/utils)
