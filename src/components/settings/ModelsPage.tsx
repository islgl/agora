import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmbeddingModelList } from './EmbeddingModelList';
import { ModelList } from './ModelList';
import { SettingsPage } from './SettingsPage';

/**
 * Settings → Models page. Hosts two sibling lists behind a horizontal tab
 * strip: chat LLMs (named model configs the agent speaks as) and embedding
 * models (vector index for auto-memory). Both lists share the Providers-tab
 * API key + base URLs; the embedding form lets users override the URL
 * per config when their gateway handles chat but not embeddings.
 */
export function ModelsPage() {
  return (
    <SettingsPage
      title="Models"
      description="Model configs the agent can use. Chat models drive conversations; embedding models power auto-memory recall. All share the API key + base URLs from the Providers tab unless overridden."
    >
      <Tabs defaultValue="chat" className="!gap-4">
        {/* Full-width segmented control: two equal columns so each label
            stretches horizontally and the two tabs feel balanced. */}
        <TabsList className="w-full grid grid-cols-2 !h-10">
          <TabsTrigger
            value="chat"
            className="w-full !justify-center text-center"
          >
            Chat
          </TabsTrigger>
          <TabsTrigger
            value="embedding"
            className="w-full !justify-center text-center"
          >
            Embedding
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="min-w-0">
          <ModelList />
        </TabsContent>

        <TabsContent value="embedding" className="min-w-0">
          <EmbeddingModelList />
        </TabsContent>
      </Tabs>
    </SettingsPage>
  );
}
