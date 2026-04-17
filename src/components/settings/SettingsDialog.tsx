import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ModelList } from './ModelList';
import { ProvidersForm } from './ProvidersForm';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-xl rounded-2xl bg-background border-border"
        style={{
          boxShadow: '0 0 0 1px var(--border), 0 4px 24px rgba(0,0,0,0.08)',
        }}
      >
        <DialogHeader>
          <DialogTitle
            className="text-foreground"
            style={{ fontFamily: 'Georgia, serif', fontWeight: 500 }}
          >
            Settings
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="models" className="mt-2">
          <TabsList className="w-full bg-secondary rounded-xl">
            <TabsTrigger
              value="models"
              className="flex-1 rounded-lg text-muted-foreground
                         data-[state=active]:bg-card data-[state=active]:text-foreground
                         data-[state=active]:shadow-none"
            >
              Models
            </TabsTrigger>
            <TabsTrigger
              value="providers"
              className="flex-1 rounded-lg text-muted-foreground
                         data-[state=active]:bg-card data-[state=active]:text-foreground
                         data-[state=active]:shadow-none"
            >
              Providers
            </TabsTrigger>
          </TabsList>
          <TabsContent value="models" className="mt-4">
            <ModelList />
          </TabsContent>
          <TabsContent value="providers" className="mt-4">
            <ProvidersForm />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
