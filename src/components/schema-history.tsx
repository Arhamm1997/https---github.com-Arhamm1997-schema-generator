'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
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
} from "@/components/ui/alert-dialog"
import useLocalStorage from '@/hooks/use-local-storage';
import { type HistoryItem } from '@/lib/types';
import { History, Download, Trash2, RotateCcw, FileCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from './ui/scroll-area';

interface SchemaHistoryProps {
  setGeneratedSchema: (schema: string) => void;
}

export function SchemaHistory({ setGeneratedSchema }: SchemaHistoryProps) {
  const [history, setHistory] = useLocalStorage<HistoryItem[]>('schema-history', []);
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleLoad = (schema: string) => {
    setGeneratedSchema(schema);
    setOpen(false);
    toast({ title: 'Schema Loaded', description: 'The historical schema has been loaded into the editor.' });
  };

  const handleDownload = (item: HistoryItem) => {
    const blob = new Blob([item.schema], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.name.replace(/\s+/g, '_')}_${item.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: 'Download Started', description: `Downloading ${a.download}.`});
  };

  const handleDelete = (id: string) => {
    setHistory(history.filter((item) => item.id !== id));
    toast({ variant: 'destructive', title: 'Deleted', description: 'Schema record has been deleted.' });
  };
  
  const handleClearAll = () => {
    setHistory([]);
    toast({ variant: 'destructive', title: 'History Cleared', description: 'All schema records have been deleted.' });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline"><History className="mr-0 md:mr-2 h-4 w-4" /><span className="hidden md:inline">History</span></Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:w-[540px] flex flex-col">
        <SheetHeader>
          <SheetTitle>Generation History</SheetTitle>
          <SheetDescription>
            Manage your previously generated schemas. History is saved in your browser.
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full pr-6">
            {history.length > 0 ? (
              <div className="space-y-4">
                {history.map((item) => (
                  <div key={item.id} className="border p-4 rounded-lg flex justify-between items-start gap-4">
                    <div className="flex-grow overflow-hidden">
                      <p className="font-semibold truncate text-primary">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(item.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => handleLoad(item.schema)} title="Load Schema"><RotateCcw className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDownload(item)} title="Download JSON"><Download className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" title="Delete"><Trash2 className="h-4 w-4" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete this schema from your history.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(item.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                  <FileCode className="h-12 w-12 mb-4" />
                  <p className="font-semibold">No History Yet</p>
                  <p className="text-sm">Generate a schema to see your history here.</p>
              </div>
            )}
          </ScrollArea>
        </div>
        <SheetFooter>
            {history.length > 0 && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full">
                            <Trash2 className="mr-2 h-4 w-4" /> Clear All History
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                            This will permanently delete all your generated schemas. This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleClearAll}>Yes, delete all</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
