'use client';

import React, { useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { getSchemaFromUrlAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface UrlFormProps {
  setGeneratedSchema: (schema: string) => void;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? (
        'Generating...'
      ) : (
        <>
          <Sparkles className="mr-2 h-4 w-4" /> Generate Schema
        </>
      )}
    </Button>
  );
}

export function UrlForm({ setGeneratedSchema }: UrlFormProps) {
  const { toast } = useToast();
  const initialState = { success: false, error: null, data: null };
  const [state, formAction] = useFormState(getSchemaFromUrlAction, initialState);

  useEffect(() => {
    if (state.success && state.data) {
      setGeneratedSchema(state.data);
      toast({
        title: 'Success!',
        description: 'Schema generated from URL.',
      });
    } else if (state.error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: state.error,
      });
    }
  }, [state, setGeneratedSchema, toast]);

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Generate from URL</CardTitle>
        <CardDescription>
          Enter a URL and our AI will automatically generate the most relevant schema markup for the page.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">Page URL</Label>
              <Input
                id="url"
                name="url"
                placeholder="https://example.com/product-page"
                required
                type="url"
              />
            </div>
            <SubmitButton />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
