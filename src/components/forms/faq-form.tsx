'use client';

import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFormState, useFormStatus } from 'react-dom';
import { cleanObject } from '@/lib/utils';
import { generateFaqAnswersAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Sparkles, Trash2 } from 'lucide-react';

const formSchema = z.object({
  faqs: z.array(z.object({
    question: z.string().min(1, 'Question cannot be empty.'),
    answer: z.string(),
  })),
});

type FaqFormValues = z.infer<typeof formSchema>;

function GenerateAnswersButton({ questions }: { questions: string }) {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" size="sm" disabled={pending || !questions.trim()}>
            {pending ? 'Generating...' : <><Sparkles className="mr-2 h-4 w-4" />Generate Answers with AI</>}
        </Button>
    )
}

export function FaqForm({ setGeneratedSchema }: { setGeneratedSchema: (schema: string) => void }) {
  const { toast } = useToast();
  const form = useForm<FaqFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { faqs: [{ question: '', answer: '' }] },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "faqs",
  });

  const watchedFaqs = form.watch('faqs');
  const questionsToGenerate = watchedFaqs
    .filter(faq => faq.question && !faq.answer)
    .map(faq => faq.question)
    .join('\n');

  const initialState = { success: false, error: null, data: null };
  const [state, formAction] = useFormState(generateFaqAnswersAction, initialState);

  useEffect(() => {
    if (state.success && state.data) {
        const answers = state.data.split('\n');
        let answerIndex = 0;
        const updatedFaqs = watchedFaqs.map(faq => {
            if (faq.question && !faq.answer && answerIndex < answers.length) {
                return { ...faq, answer: answers[answerIndex++] };
            }
            return faq;
        });
        form.setValue('faqs', updatedFaqs);
        toast({ title: "Answers Generated!", description: "AI has generated answers for your questions." });
    } else if (state.error) {
        toast({ variant: 'destructive', title: "Error", description: state.error });
    }
  }, [state]);

  useEffect(() => {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: watchedFaqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    };
    const cleanedSchema = cleanObject(schema);
    if(cleanedSchema.mainEntity && cleanedSchema.mainEntity.length > 0) {
      setGeneratedSchema(JSON.stringify(cleanedSchema, null, 2));
    } else {
      setGeneratedSchema('');
    }
  }, [watchedFaqs, setGeneratedSchema]);

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>FAQ Schema</CardTitle>
        <CardDescription>Add frequently asked questions and answers. Use the AI helper to generate answers automatically.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-6">
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-lg space-y-4 relative bg-card">
                   <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                  <FormField
                    control={form.control}
                    name={`faqs.${index}.question`}
                    render={({ field }) => (
                      <FormItem><FormLabel>Question {index + 1}</FormLabel><FormControl><Input placeholder="e.g., What is your return policy?" {...field} /></FormControl></FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`faqs.${index}.answer`}
                    render={({ field }) => (
                      <FormItem><FormLabel>Answer</FormLabel><FormControl><Textarea placeholder="e.g., We accept returns within 30 days..." {...field} /></FormControl></FormItem>
                    )}
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 justify-between items-center">
              <Button type="button" variant="outline" onClick={() => append({ question: '', answer: '' })}><PlusCircle className="mr-2 h-4 w-4" />Add Question</Button>
               <form action={formAction}>
                 <input type="hidden" name="questions" value={questionsToGenerate} />
                 <GenerateAnswersButton questions={questionsToGenerate} />
               </form>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
