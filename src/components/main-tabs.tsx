'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UrlForm } from '@/components/forms/url-form';
import { LocalBusinessForm } from '@/components/forms/local-business-form';
import { FaqForm } from '@/components/forms/faq-form';
import { VoiceSearchForm } from '@/components/forms/voice-search-form';
import { Building2, HelpCircle, Link, MicVocal } from 'lucide-react';

interface MainTabsProps {
  setGeneratedSchema: (schema: string) => void;
}

export function MainTabs({ setGeneratedSchema }: MainTabsProps) {
  return (
    <Tabs defaultValue="url" className="w-full">
      <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
        <TabsTrigger value="url"><Link className="mr-2"/>From URL</TabsTrigger>
        <TabsTrigger value="local"><Building2 className="mr-2"/>Local Business</TabsTrigger>
        <TabsTrigger value="faq"><HelpCircle className="mr-2"/>FAQ</TabsTrigger>
        <TabsTrigger value="voice"><MicVocal className="mr-2"/>Voice Search</TabsTrigger>
      </TabsList>
      <TabsContent value="url" className="mt-6">
        <UrlForm setGeneratedSchema={setGeneratedSchema} />
      </TabsContent>
      <TabsContent value="local" className="mt-6">
        <LocalBusinessForm setGeneratedSchema={setGeneratedSchema} />
      </TabsContent>
      <TabsContent value="faq" className="mt-6">
        <FaqForm setGeneratedSchema={setGeneratedSchema} />
      </TabsContent>
      <TabsContent value="voice" className="mt-6">
        <VoiceSearchForm setGeneratedSchema={setGeneratedSchema} />
      </TabsContent>
    </Tabs>
  );
}
