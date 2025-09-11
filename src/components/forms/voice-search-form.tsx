'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFormState, useFormStatus } from 'react-dom';
import { cleanObject } from '@/lib/utils';
import { suggestKeywordsAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Sparkles } from 'lucide-react';

const formSchema = z.object({
  businessType: z.string().min(1, 'Business type is required.'),
  businessName: z.string().min(1, 'Business name is required.'),
  location: z.string().min(1, 'Location is required.'),
  speakableCssSelector: z.string().min(1, 'CSS selector is required.'),
});

type VoiceSearchFormValues = z.infer<typeof formSchema>;

function SuggestKeywordsButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled}>
      {pending ? 'Suggesting...' : <><Sparkles className="mr-2 h-4 w-4" />Suggest Keywords</>}
    </Button>
  );
}

export function VoiceSearchForm({ setGeneratedSchema }: { setGeneratedSchema: (schema: string) => void }) {
  const { toast } = useToast();
  const [keywords, setKeywords] = useState<string[]>([]);
  const form = useForm<VoiceSearchFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { businessType: '', businessName: '', location: '', speakableCssSelector: '' },
  });

  const watchedValues = form.watch();

  const initialState = { success: false, error: null, data: null };
  const [state, formAction] = useFormState(suggestKeywordsAction, initialState);

  const canSuggest = watchedValues.businessName && watchedValues.businessType && watchedValues.location;

  useEffect(() => {
    if (state.success && state.data) {
      setKeywords(state.data);
      toast({ title: "Keywords Suggested!", description: "AI has suggested some conversational keywords." });
    } else if (state.error) {
      toast({ variant: 'destructive', title: "Error", description: state.error });
    }
  }, [state]);

  useEffect(() => {
    const { speakableCssSelector } = watchedValues;
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      'speakable': {
        '@type': 'SpeakableSpecification',
        'cssSelector': [speakableCssSelector],
      },
    };
    const cleanedSchema = cleanObject(schema);
    setGeneratedSchema(JSON.stringify(cleanedSchema, null, 2));
  }, [watchedValues, setGeneratedSchema]);

  return (
    <div className="space-y-6">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Speakable Schema</CardTitle>
          <CardDescription>Optimize your content for voice search by specifying which parts are best for audio playback.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-4">
              <FormField
                control={form.control}
                name="speakableCssSelector"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CSS Selectors for Speakable Content</FormLabel>
                    <FormControl>
                      <Input placeholder=".article-body, .summary" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Conversational Keywords</CardTitle>
          <CardDescription>Get AI-powered suggestions for keywords that users might use in voice searches like "near me" queries.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form action={formAction} className="space-y-4">
                <input type="hidden" name="businessType" value={watchedValues.businessType} />
                <input type="hidden" name="businessName" value={watchedValues.businessName} />
                <input type="hidden" name="location" value={watchedValues.location} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormField control={form.control} name="businessType" render={({ field }) => (
                        <FormItem><FormLabel>Business Type</FormLabel><FormControl><Input placeholder="e.g., restaurant, plumber" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="businessName" render={({ field }) => (
                        <FormItem><FormLabel>Business Name</FormLabel><FormControl><Input placeholder="e.g., Acme Burgers" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                <FormField control={form.control} name="location" render={({ field }) => (
                    <FormItem><FormLabel>Location</FormLabel><FormControl><Input placeholder="e.g., San Francisco, CA" {...field} /></FormControl><FormMessage /></FormItem>
                )} />

                <SuggestKeywordsButton disabled={!canSuggest} />
            </form>
          </Form>
          {keywords.length > 0 && (
            <div className="mt-6">
              <h4 className="font-semibold mb-3 flex items-center"><Lightbulb className="mr-2 h-4 w-4 text-primary"/>Suggested Keywords</h4>
              <div className="flex flex-wrap gap-2">
                {keywords.map((kw, i) => <Badge key={i} variant="secondary">{kw}</Badge>)}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
