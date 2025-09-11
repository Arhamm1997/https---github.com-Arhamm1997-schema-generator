import { Logo } from '@/components/icons/logo';

export function AppHeader() {
  return (
    <header className="py-4 px-4 md:px-6 lg:px-8 border-b sticky top-0 bg-background/80 backdrop-blur-sm z-10">
      <div className="container mx-auto flex items-center gap-3">
        <Logo className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold font-headline text-foreground tracking-tight">
          SchemaGenius
        </h1>
      </div>
    </header>
  );
}
