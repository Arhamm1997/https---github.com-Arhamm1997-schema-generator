'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Check, Copy } from 'lucide-react';
import { SchemaHistory } from './schema-history';

interface SchemaPreviewProps {
  generatedSchema: string;
  setGeneratedSchema: (schema: string) => void;
}

export function SchemaPreview({ generatedSchema, setGeneratedSchema }: SchemaPreviewProps) {
  const { toast } = useToast();
  const [hasCopied, setHasCopied] = useState(false);

  const fullSchema = generatedSchema 
    ? `<script type="application/ld+json">\n${generatedSchema}\n</script>`
    : '';

  const handleCopy = () => {
    if (!fullSchema) return;
    navigator.clipboard.writeText(fullSchema);
    setHasCopied(true);
    toast({
      title: 'Copied to Clipboard!',
      description: 'The schema markup has been copied successfully.',
    });
    setTimeout(() => setHasCopied(false), 2000);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="font-headline">Schema Preview</CardTitle>
          <SchemaHistory setGeneratedSchema={setGeneratedSchema} />
        </div>
        <CardDescription>Review and copy the generated schema markup.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <div className="bg-muted p-4 rounded-md overflow-x-auto text-sm font-code w-full min-h-[200px] border">
            {generatedSchema ? (
              <pre><code>{fullSchema}</code></pre>
            ) : (
              <div className="text-muted-foreground flex items-center justify-center h-full min-h-[200px]">
                Your generated schema will appear here.
              </div>
            )}
          </div>
          {generatedSchema && (
            <Button
              onClick={handleCopy}
              size="icon"
              variant="ghost"
              className="absolute top-3 right-3 h-8 w-8"
            >
              {hasCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
              <span className="sr-only">Copy to clipboard</span>
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Always validate your schema with tools like Google's Rich Results Test before deploying to production.
        </p>
      </CardContent>
    </Card>
  );
}
