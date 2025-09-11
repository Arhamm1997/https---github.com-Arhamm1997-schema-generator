'use client';

import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cleanObject } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Textarea } from '../ui/textarea';

const formSchema = z.object({
  name: z.string().min(1, 'Business name is required.'),
  description: z.string().optional(),
  streetAddress: z.string().optional(),
  addressLocality: z.string().optional(),
  addressRegion: z.string().optional(),
  postalCode: z.string().optional(),
  addressCountry: z.string().optional(),
  telephone: z.string().optional(),
  email: z.string().email('Invalid email address.').optional().or(z.literal('')),
  url: z.string().url('Invalid URL.').optional().or(z.literal('')),
  openingHours: z.array(z.object({
    day: z.string().min(1, 'Day is required'),
    hours: z.string().min(1, 'Hours are required'),
  })).optional(),
});

type LocalBusinessFormValues = z.infer<typeof formSchema>;

interface LocalBusinessFormProps {
  setGeneratedSchema: (schema: string) => void;
}

export function LocalBusinessForm({ setGeneratedSchema }: LocalBusinessFormProps) {
  const form = useForm<LocalBusinessFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      streetAddress: '',
      addressLocality: '',
      addressRegion: '',
      postalCode: '',
      addressCountry: '',
      telephone: '',
      email: '',
      url: '',
      openingHours: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "openingHours",
  });

  const watchedValues = form.watch();

  useEffect(() => {
    const { name, description, streetAddress, addressLocality, addressRegion, postalCode, addressCountry, telephone, email, url, openingHours } = watchedValues;
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name,
      description,
      url,
      telephone,
      email,
      address: {
        '@type': 'PostalAddress',
        streetAddress,
        addressLocality,
        addressRegion,
        postalCode,
        addressCountry,
      },
      openingHoursSpecification: openingHours?.map(oh => ({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: oh.day,
        opens: oh.hours.split('-')[0]?.trim(),
        closes: oh.hours.split('-')[1]?.trim(),
      }))
    };

    const cleanedSchema = cleanObject(schema);
    setGeneratedSchema(JSON.stringify(cleanedSchema, null, 2));
  }, [watchedValues, setGeneratedSchema]);

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Local Business Schema</CardTitle>
        <CardDescription>Fill in the details for your local business to generate the schema.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-6">
            <Accordion type="multiple" defaultValue={['basic-info', 'address']} className="w-full">
              <AccordionItem value="basic-info">
                <AccordionTrigger>Basic Information</AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Business Name *</FormLabel><FormControl><Input placeholder="e.g., Acme Cafe" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                   <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="A short description of your business." {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="telephone" render={({ field }) => (
                    <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input placeholder="(555) 123-4567" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="contact@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="url" render={({ field }) => (
                    <FormItem><FormLabel>Website URL</FormLabel><FormControl><Input placeholder="https://www.example.com" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="address">
                <AccordionTrigger>Address</AccordionTrigger>
                <AccordionContent className="space-y-4">
                  <FormField control={form.control} name="streetAddress" render={({ field }) => (
                    <FormItem><FormLabel>Street Address</FormLabel><FormControl><Input placeholder="123 Main St" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="addressLocality" render={({ field }) => (
                    <FormItem><FormLabel>City</FormLabel><FormControl><Input placeholder="Anytown" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="addressRegion" render={({ field }) => (
                    <FormItem><FormLabel>State / Region</FormLabel><FormControl><Input placeholder="CA" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="postalCode" render={({ field }) => (
                    <FormItem><FormLabel>ZIP / Postal Code</FormLabel><FormControl><Input placeholder="12345" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="addressCountry" render={({ field }) => (
                    <FormItem><FormLabel>Country</FormLabel><FormControl><Input placeholder="US" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="hours">
                <AccordionTrigger>Opening Hours</AccordionTrigger>
                <AccordionContent className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex gap-2 items-end">
                      <FormField control={form.control} name={`openingHours.${index}.day`} render={({ field }) => (
                        <FormItem className="flex-1"><FormLabel>Day(s)</FormLabel><FormControl><Input placeholder="Monday-Friday" {...field} /></FormControl></FormItem>
                      )}/>
                      <FormField control={form.control} name={`openingHours.${index}.hours`} render={({ field }) => (
                         <FormItem className="flex-1"><FormLabel>Hours</FormLabel><FormControl><Input placeholder="09:00-17:00" {...field} /></FormControl></FormItem>
                      )}/>
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                    </div>
                  ))}
                   <Button type="button" variant="outline" size="sm" onClick={() => append({ day: '', hours: '' })}><PlusCircle className="mr-2 h-4 w-4"/>Add Hours</Button>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
