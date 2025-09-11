'use client';

import React, { useState, useEffect } from 'react';
import { AppHeader } from '@/components/header';
import { MainTabs } from '@/components/main-tabs';
import { SchemaPreview } from '@/components/schema-preview';

export default function Home() {
  const [generatedSchema, setGeneratedSchema] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null; // Or a loading spinner
  }

  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />
      <main className="flex-1 w-full container mx-auto p-4 md:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div>
            <MainTabs setGeneratedSchema={setGeneratedSchema} />
          </div>
          <div className="lg:sticky lg:top-8">
            <SchemaPreview
              generatedSchema={generatedSchema}
              setGeneratedSchema={setGeneratedSchema}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
