'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import useLocalStorage from '@/hooks/use-local-storage';
import type { HistoryItem } from '@/lib/types';
import { cleanObject } from '@/lib/utils';
import { SlidersHorizontal, Code, History, Copy, Trash2, Download, CircleCheck, AlertTriangle, Wand2, Bot, Link } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { generateSchemaFromUrl } from '@/ai/flows/generate-schema-from-url';
import { Checkbox } from '@/components/ui/checkbox';


const MotionCard = motion(Card);

const Header = () => (
  <motion.header 
    initial={{ y: -100, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ duration: 0.5, ease: 'easeOut' }}
    className="py-8 text-center sticky top-0 z-50"
  >
    <div className="max-w-7xl mx-auto px-6">
      <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mb-3 tracking-tighter flex items-center justify-center gap-4">
        <Wand2 size={40} className="text-primary animate-float" /> Voice Schema Generator
      </h1>
      <p className="text-lg text-muted-foreground font-medium">AI-powered schema markup for superior voice search visibility.</p>
    </div>
  </motion.header>
);

const UrlFetchCard = ({ onSchemaGenerated }: { onSchemaGenerated: (schema: string, name: string) => void }) => {
    const [url, setUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();

    const handleGenerate = async () => {
        if (!url) {
            toast({ variant: 'destructive', title: 'URL is required', description: 'Please enter a URL to fetch.' });
            return;
        }
        setIsLoading(true);
        try {
            const result = await generateSchemaFromUrl({ url });
            const schemaString = `<script type="application/ld+json">\n${JSON.stringify(result.schema, null, 2)}\n</script>`;
            const name = result.schema.mainEntity?.name || result.schema.name || new URL(url).hostname;
            onSchemaGenerated(schemaString, name);
            toast({ title: 'Schema Generated from URL!', description: 'The schema has been populated with data from the URL.' });
        } catch (error) {
            console.error('Error generating schema from URL:', error);
            toast({ variant: 'destructive', title: 'Generation Failed', description: 'Could not generate schema from the provided URL.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <MotionCard
            className="bg-card/50 border-border shadow-2xl backdrop-blur-xl mb-8"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
        >
            <CardHeader>
                <CardTitle className="flex items-center gap-3 text-2xl"><Link className="text-accent" /> Fetch from URL</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground mb-4 text-sm">Enter a URL to have AI automatically generate a base schema for you.</p>
                <div className="flex gap-2">
                    <Input
                        id="url-fetch"
                        type="url"
                        placeholder="https://yourbusiness.com/about"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        className="bg-background border-border focus:ring-ring focus:ring-2"
                        disabled={isLoading}
                    />
                    <Button onClick={handleGenerate} disabled={isLoading}>
                        {isLoading ? <motion.div className="w-4 h-4 border-2 border-background/50 border-t-background rounded-full animate-spin" /> : <Wand2 />}
                        {isLoading ? 'Generating...' : 'Generate with AI'}
                    </Button>
                </div>
            </CardContent>
        </MotionCard>
    );
};


const FormField = ({ id, label, placeholder, type = 'text', rows, tooltip, children, value, onChange, name, icon: Icon, ...props }: any) => (
    <div className="flex flex-col gap-2 mb-4">
        <label htmlFor={id} className="flex items-center text-sm font-medium text-muted-foreground">
            {Icon && <Icon className="mr-2 h-4 w-4 text-primary/80" />}
            {label}
            {tooltip && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Bot className="ml-2 h-4 w-4 cursor-help text-muted-foreground/50"/>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
            )}
        </label>
        {type === 'textarea' ? (
            <Textarea id={id} placeholder={placeholder} rows={rows} value={value} onChange={onChange} name={name} {...props} className="bg-background border-border focus:ring-ring focus:ring-2" />
        ) : type === 'select' ? (
            children
        ) : (
            <Input id={id} type={type} placeholder={placeholder} value={value} onChange={onChange} name={name} {...props} className="bg-background border-border focus:ring-ring focus:ring-2" />
        )}
    </div>
);

const BasicInfoTab = ({ formData, handleChange, handleSelectChange }: any) => (
  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
    <FormField id="businessType" label="Business Type" type="select">
        <Select name="businessType" onValueChange={(value) => handleSelectChange('businessType', value)} value={formData.businessType}>
            <SelectTrigger className="bg-background border-border focus:ring-ring focus:ring-2"><SelectValue placeholder="Select Business Type" /></SelectTrigger>
            <SelectContent>
                <SelectItem value="LocalBusiness">Local Business</SelectItem>
                <SelectItem value="Restaurant">Restaurant</SelectItem>
                <SelectItem value="HVACBusiness">HVAC Business</SelectItem>
                <SelectItem value="ProfessionalService">Professional Service</SelectItem>
                <SelectItem value="HomeAndConstructionBusiness">Home &amp; Construction</SelectItem>
                <SelectItem value="MedicalBusiness">Medical Business</SelectItem>
                <SelectItem value="LegalService">Legal Service</SelectItem>
                <SelectItem value="AutomotiveBusiness">Automotive Business</SelectItem>
                <SelectItem value="Article">Article</SelectItem>
            </SelectContent>
        </Select>
    </FormField>
    <div className="grid md:grid-cols-2 gap-4">
      <FormField id="name" name="name" label="Business Name" placeholder="Your Business Name" value={formData.name} onChange={handleChange} />
      <FormField id="url" name="url" label="Website URL" placeholder="https://yourbusiness.com" value={formData.url} onChange={handleChange}/>
    </div>
    <FormField id="description" name="description" label="Business Description" type="textarea" rows={3} placeholder="Describe your business..." tooltip="Keep it conversational for voice search" value={formData.description} onChange={handleChange}/>
    <div className="grid md:grid-cols-2 gap-4">
      <FormField id="telephone" name="telephone" label="Phone Number" placeholder="+1-555-123-4567" value={formData.telephone} onChange={handleChange}/>
      <FormField id="email" name="email" label="Email Address" placeholder="info@yourbusiness.com" value={formData.email} onChange={handleChange}/>
    </div>
    <FormField id="streetAddress" name="streetAddress" label="Street Address" placeholder="123 Main Street" value={formData.streetAddress} onChange={handleChange}/>
     <div className="grid md:grid-cols-2 gap-4">
      <FormField id="addressLocality" name="addressLocality" label="City" placeholder="Your City" value={formData.addressLocality} onChange={handleChange}/>
      <FormField id="addressRegion" name="addressRegion" label="State/Region" placeholder="State" value={formData.addressRegion} onChange={handleChange}/>
    </div>
     <div className="grid md:grid-cols-2 gap-4">
      <FormField id="postalCode" name="postalCode" label="Postal Code" placeholder="12345" value={formData.postalCode} onChange={handleChange}/>
      <FormField id="addressCountry" name="addressCountry" label="Country" placeholder="US" value={formData.addressCountry} onChange={handleChange}/>
    </div>
  </motion.div>
);

const VoiceSearchTab = ({ formData, handleChange }: any) => (
  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
    <FormField id="voiceSummary" name="voiceSummary" label="Voice Search Summary" type="textarea" rows={2} placeholder="Brief summary for voice assistants (20-30 words)..." tooltip="20-30 words for voice assistants" value={formData.voiceSummary} onChange={handleChange}/>
    <FormField id="speakableContent" name="speakableContent" label="Speakable Content CSS Selectors" type="textarea" rows={3} placeholder=".business-summary, .contact-info, .hours-info" value={formData.speakableContent} onChange={handleChange}/>
    <FormField id="voiceKeywords" name="voiceKeywords" label="Voice Search Keywords" placeholder="near me, best, top rated, how to, what is" value={formData.voiceKeywords} onChange={handleChange}/>
    <FormField id="faqQuestions" name="faqQuestions" label="Common Voice Questions" type="textarea" rows={4} placeholder={"What are your hours?\nWhere are you located?\nDo you offer free estimates?"} value={formData.faqQuestions} onChange={handleChange}/>
    <FormField id="serviceAreas" name="serviceAreas" label="Service Areas (for 'near me' searches)" placeholder="Downtown, Midtown, Suburbs, City Name" value={formData.serviceAreas} onChange={handleChange}/>
     <div className="grid md:grid-cols-2 gap-4">
        <FormField id="ratingValue" name="ratingValue" label="Rating (1-5)" type="number" placeholder="4.8" min="1" max="5" step="0.1" value={formData.ratingValue} onChange={handleChange}/>
        <FormField id="reviewCount" name="reviewCount" label="Review Count" type="number" placeholder="127" value={formData.reviewCount} onChange={handleChange}/>
    </div>
  </motion.div>
);

const AdvancedTab = ({ formData, handleChange, socialProfiles, setSocialProfiles }: any) => {
    const [socialUrl, setSocialUrl] = useState('');

    const addSocialProfile = () => {
        if (!socialUrl) return;
        setSocialProfiles((prev: string[])=> [...prev, socialUrl]);
        setSocialUrl('');
    };

    const removeSocialProfile = (urlToRemove: string) => {
        setSocialProfiles(socialProfiles.filter((url: string) => url !== urlToRemove));
    };

    return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
        <div className="grid md:grid-cols-2 gap-4">
            <FormField id="latitude" name="latitude" label="Latitude" type="number" step="any" placeholder="40.7128" value={formData.latitude} onChange={handleChange}/>
            <FormField id="longitude" name="longitude" label="Longitude" type="number" step="any" placeholder="-74.0060" value={formData.longitude} onChange={handleChange}/>
        </div>
        <FormField id="googleMap" name="googleMap" label="Google Maps URL" type="url" placeholder="https://maps.google.com/..." value={formData.googleMap} onChange={handleChange}/>
        <FormField id="servicesOffered" name="servicesOffered" label="Services Offered" type="textarea" rows={4} placeholder={"Service 1\nService 2\nService 3"} value={formData.servicesOffered} onChange={handleChange}/>
        
        <div className="form-group">
            <label htmlFor="socialSelect" className="flex items-center text-sm font-medium text-muted-foreground">
                <i className="fas fa-share-alt mr-2 text-primary"></i>Social Media Profiles
            </label>
            <div className="flex gap-2">
                <Input placeholder="Enter full profile URL (e.g., https://twitter.com/yourbiz)" value={socialUrl} onChange={(e) => setSocialUrl(e.target.value)} className="bg-background border-border" />
                <Button onClick={addSocialProfile}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
                {socialProfiles.map((url: string) => (
                    <motion.div 
                      key={url} 
                      className="bg-primary/10 border border-primary/20 px-3 py-1 rounded-full text-xs flex items-center gap-2 text-primary"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                        {url} <button onClick={() => removeSocialProfile(url)} className="text-red-400 hover:text-red-300">×</button>
                    </motion.div>
                ))}
            </div>
        </div>
    </motion.div>
    )
};


const TABS = {
    'basic': 'Basic Info',
    'voice': 'Voice Search',
    'advanced': 'Advanced',
};

export default function Home() {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState('basic');
    const [generatedSchema, setGeneratedSchema] = useState('');
    const [schemaHistory, setSchemaHistory] = useLocalStorage<HistoryItem[]>('schemaHistory', []);
    const [socialProfiles, setSocialProfiles] = useLocalStorage<string[]>('socialProfiles', []);
    const [selectedHistory, setSelectedHistory] = useState<Set<string>>(new Set());
    const [isMounted, setIsMounted] = useState(false);
    
    useEffect(() => {
        setIsMounted(true);
    }, []);

    const [formData, setFormData] = useLocalStorage('formData', {
        businessType: 'LocalBusiness', name: '', url: '', description: '', telephone: '', email: '', streetAddress: '', addressLocality: '', addressRegion: '', postalCode: '', addressCountry: 'US', voiceSummary: '', speakableContent: '.business-summary, .contact-info, .hours-info, .voice-answer', voiceKeywords: 'near me, best, top rated, local, professional', faqQuestions: 'What are your hours?\nWhere are you located?\nDo you offer free estimates?\nHow can I contact you?', serviceAreas: '', ratingValue: '', reviewCount: '', latitude: '', longitude: '', googleMap: '', servicesOffered: '',
    });

    const handleAiSchemaGenerated = (schema: string, name: string) => {
        setGeneratedSchema(schema);
        const newHistoryItem: HistoryItem = {
            id: Date.now().toString(),
            name: name || 'AI Generated Schema',
            timestamp: new Date().toLocaleString(),
            schema: schema
        };
        setSchemaHistory(prev => [newHistoryItem, ...prev].slice(0, 10));
    };

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    }, [setFormData]);

    const handleSelectChange = useCallback((name: string, value: string) => {
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    }, [setFormData]);

    const generateSchema = useCallback(() => {
        const { name, description, telephone, streetAddress, addressLocality, addressRegion } = formData;
        if (!name || !description || !telephone || !streetAddress || !addressLocality || !addressRegion) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please fill in all required fields in the Basic Info tab.'});
            setActiveTab('basic');
            return;
        }

        const baseSchema = {
            "@context": "https://schema.org",
            "@type": "WebPage",
            "url": formData.url,
            "name": formData.name,
        }

        const mainEntity: any = {
            "@type": formData.businessType,
            "name": formData.name,
            "description": formData.description,
            "url": formData.url,
            "telephone": formData.telephone,
            "address": {
                "@type": "PostalAddress",
                "streetAddress": formData.streetAddress,
                "addressLocality": formData.addressLocality,
                "addressRegion": formData.addressRegion,
                "postalCode": formData.postalCode,
                "addressCountry": formData.addressCountry
            },
        };
        
        if (formData.faqQuestions) {
           const faqEntity = formData.faqQuestions.split('\n').filter(q => q.trim()).map(q => ({
                "@type": "Question",
                "name": q.trim(),
                "acceptedAnswer": { "@type": "Answer", "text": `Contact us at ${formData.telephone} for more information.` }
            }));
           if (faqEntity.length > 0) {
                mainEntity.mainEntityOfPage = {
                    "@type": "WebPage",
                    "mainEntity": faqEntity
                }
           }
        }

        const cleanedMainEntity = cleanObject({
          ...mainEntity,
          email: formData.email,
          geo: (formData.latitude && formData.longitude) ? { "@type": "GeoCoordinates", latitude: parseFloat(formData.latitude), longitude: parseFloat(formData.longitude) } : undefined,
          hasMap: formData.googleMap,
          aggregateRating: (formData.ratingValue && formData.reviewCount) ? { "@type": "AggregateRating", ratingValue: parseFloat(formData.ratingValue), reviewCount: parseInt(formData.reviewCount) } : undefined,
          areaServed: formData.serviceAreas ? formData.serviceAreas.split(',').map(area => ({ "@type": "Place", "name": area.trim() })) : undefined,
          makesOffer: formData.servicesOffered ? formData.servicesOffered.split('\n').map(s => ({ "@type": "Offer", "itemOffered": { "@type": "Service", "name": s.trim() }})) : undefined,
          sameAs: socialProfiles.length > 0 ? socialProfiles : undefined,
        });

        const speakableContent = formData.speakableContent ? {
             "@type": "SpeakableSpecification", 
             cssSelector: formData.speakableContent.split(',').map(s => s.trim()) 
        } : undefined;
        
        const finalSchema = {
            ...baseSchema,
            mainEntity: cleanedMainEntity,
            speakable: speakableContent,
            keywords: formData.voiceKeywords,
        }

        const cleanedFinalSchema = cleanObject(finalSchema);
        
        let fullScript = `<script type="application/ld+json">\n${JSON.stringify(cleanedFinalSchema, null, 2)}\n</script>`;
        
        const metaTags = `&lt;!-- Voice Search Optimization Meta Tags --&gt;\n&lt;meta name="voice-summary" content="${formData.voiceSummary || formData.description}"&gt;\n&lt;meta name="description" content="${formData.description}"&gt;`;
        
        const finalOutput = `${metaTags}\n\n${fullScript}`;
        setGeneratedSchema(finalOutput);
        
        const newHistoryItem: HistoryItem = {
            id: Date.now().toString(),
            name: formData.name || 'Untitled Schema',
            timestamp: new Date().toLocaleString(),
            schema: finalOutput
        };
        setSchemaHistory(prev => [newHistoryItem, ...prev].slice(0, 10)); // Keep last 10

        toast({ title: 'Schema Generated!', description: 'Your voice-optimized schema is ready.'});
    }, [formData, socialProfiles, toast, setSchemaHistory]);

    const copySchema = () => {
        if (!generatedSchema) {
            toast({ variant: 'destructive', title: 'Nothing to Copy', description: 'Please generate a schema first.' });
            return;
        }
        navigator.clipboard.writeText(generatedSchema);
        toast({ title: 'Copied to clipboard!', description: 'Your schema is now in your clipboard.', icon: <Copy className="h-4 w-4" /> });
    };
    
    const validateSchema = () => {
        if (!generatedSchema) {
            toast({ variant: 'destructive', title: 'Nothing to validate', description: 'Please generate a schema first.' });
            return;
        }
        
        const scriptContentMatch = generatedSchema.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
        const code = scriptContentMatch ? scriptContentMatch[1] : generatedSchema;
    
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = 'https://search.google.com/test/rich-results';
        form.target = '_blank';
    
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'code';
        input.value = code;
    
        form.appendChild(input);
        document.body.appendChild(form);
        form.submit();
        document.body.removeChild(form);
    };


    const resetFields = () => {
        setFormData({ businessType: 'LocalBusiness', name: '', url: '', description: '', telephone: '', email: '', streetAddress: '', addressLocality: '', addressRegion: '', postalCode: '', addressCountry: 'US', voiceSummary: '', speakableContent: '.business-summary, .contact-info, .hours-info, .voice-answer', voiceKeywords: 'near me, best, top rated, local, professional', faqQuestions: 'What are your hours?\nWhere are you located?\nDo you offer free estimates?\nHow can I contact you?', serviceAreas: '', ratingValue: '', reviewCount: '', latitude: '', longitude: '', googleMap: '', servicesOffered: '', });
        setSocialProfiles([]);
        setGeneratedSchema('');
        toast({ title: 'Fields Reset', description: 'All form fields have been cleared.' });
    };

    const handleHistorySelection = (id: string) => {
        setSelectedHistory(prev => {
            const newSelection = new Set(prev);
            if (newSelection.has(id)) {
                newSelection.delete(id);
            } else {
                newSelection.add(id);
            }
            return newSelection;
        });
    };

    const handleRenameHistoryItem = (id: string, newName: string) => {
        setSchemaHistory(prev => prev.map(item => item.id === id ? { ...item, name: newName } : item));
    };

    const deleteSelectedHistory = () => {
        if (selectedHistory.size === 0) {
            toast({ variant: 'destructive', title: 'No items selected', description: 'Please select items to delete.' });
            return;
        }
        setSchemaHistory(prev => prev.filter(item => !selectedHistory.has(item.id)));
        setSelectedHistory(new Set());
        toast({ title: 'Selected items deleted.' });
    };

    const downloadSelectedHistory = () => {
        if (selectedHistory.size === 0) {
            toast({ variant: 'destructive', title: 'No items selected', description: 'Please select items to download.' });
            return;
        }
        schemaHistory.forEach(item => {
            if (selectedHistory.has(item.id)) {
                const blob = new Blob([item.schema], { type: 'text/html' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `${item.name.replace(/ /g, '_')}.html`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }
        });
    };

    const tabContent = useMemo(() => {
      switch(activeTab) {
        case 'basic': return <BasicInfoTab formData={formData} handleChange={handleChange} handleSelectChange={handleSelectChange} />;
        case 'voice': return <VoiceSearchTab formData={formData} handleChange={handleChange} />;
        case 'advanced': return <AdvancedTab formData={formData} handleChange={handleChange} socialProfiles={socialProfiles} setSocialProfiles={setSocialProfiles} />;
        default: return null;
      }
    }, [activeTab, formData, handleChange, handleSelectChange, socialProfiles, setSocialProfiles]);

    if (!isMounted) {
        return null;
    }

    return (
        <div className="min-h-screen w-full">
            <Header />
            <main className="max-w-screen-xl mx-auto p-4 md:p-6 lg:p-8">
                <div className="grid lg:grid-cols-2 gap-8 items-start">
                    <div>
                        <UrlFetchCard onSchemaGenerated={handleAiSchemaGenerated} />
                        <MotionCard 
                          className="bg-card/50 border-border shadow-2xl backdrop-blur-xl"
                          initial={{ opacity: 0, y: 50 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: 0.2 }}
                        >
                            <CardHeader>
                                <CardTitle className="flex items-center gap-3 text-2xl"><SlidersHorizontal className="text-primary"/>Configuration</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex w-full rounded-lg bg-background p-1 mb-6 border border-border">
                                    {Object.keys(TABS).map((tabId) => (
                                        <button
                                            key={tabId}
                                            onClick={() => setActiveTab(tabId)}
                                            className={`flex-1 p-2.5 rounded-md transition-all duration-200 font-medium text-sm text-muted-foreground relative z-10 flex items-center justify-center gap-2`}
                                        >
                                            {activeTab === tabId && <motion.div layoutId="active-tab-indicator" className="absolute inset-0 bg-primary/20 border border-primary/50 rounded-md z-[-1]" />}
                                            {TABS[tabId as keyof typeof TABS]}
                                        </button>
                                    ))}
                                </div>
                                
                                <AnimatePresence mode="wait">
                                    {tabContent}
                                </AnimatePresence>

                                <div className="grid grid-cols-2 gap-3 mt-8">
                                    <Button onClick={generateSchema} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold col-span-2"><Wand2 />Generate Schema</Button>
                                    <Button variant="outline" onClick={copySchema}><Copy/>Copy</Button>
                                    <Button variant="outline" onClick={validateSchema}><CircleCheck/>Validate with Google</Button>
                                    <Button variant="destructive" onClick={resetFields} className="col-span-2"><Trash2/>Reset All</Button>
                                </div>
                            </CardContent>
                        </MotionCard>
                    </div>

                    <div className="lg:sticky lg:top-24 flex flex-col gap-8">
                        <MotionCard 
                          className="bg-card/50 border-border shadow-2xl backdrop-blur-xl"
                          initial={{ opacity: 0, y: 50 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: 0.3 }}
                        >
                            <CardHeader>
                                <CardTitle className="flex items-center gap-3 text-2xl"><Code className="text-accent"/>Schema Preview</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="bg-background border border-border rounded-lg p-4 font-mono text-xs max-h-96 overflow-auto relative text-muted-foreground">
                                    <AnimatePresence>
                                    <motion.pre
                                        key={generatedSchema}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        {generatedSchema || '// Your generated schema will appear here...'}
                                    </motion.pre>
                                    </AnimatePresence>
                                </div>
                            </CardContent>
                        </MotionCard>
                        <MotionCard 
                          className="bg-card/50 border-border shadow-2xl backdrop-blur-xl"
                          initial={{ opacity: 0, y: 50 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: 0.4 }}
                        >
                             <CardHeader>
                                <CardTitle className="flex items-center gap-3 text-2xl"><History className="text-primary"/>Schema History</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="max-h-60 overflow-auto space-y-2 pr-2">
                                <AnimatePresence>
                                {schemaHistory.length > 0 ? schemaHistory.map((item, index) => (
                                    <motion.div
                                        key={item.id}
                                        className="bg-background border border-border p-3 rounded-lg flex items-center gap-4"
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <Checkbox 
                                            id={`history-${item.id}`}
                                            checked={selectedHistory.has(item.id)}
                                            onCheckedChange={() => handleHistorySelection(item.id)}
                                        />
                                        <div className="flex-grow cursor-pointer" onClick={() => setGeneratedSchema(item.schema)}>
                                            <Input
                                                className="bg-transparent border-none p-0 h-auto text-foreground font-semibold"
                                                value={item.name}
                                                onChange={(e) => handleRenameHistoryItem(item.id, e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <p className="text-xs text-muted-foreground">{item.timestamp}</p>
                                        </div>
                                    </motion.div>
                                )) : <div className="text-muted-foreground text-center py-8 flex flex-col items-center gap-4">
                                  <History size={40} />
                                  <p>No history yet. <br/> Generated schemas will appear here.</p>
                                  </div>}
                                </AnimatePresence>
                                </div>
                                {schemaHistory.length > 0 && 
                                    <div className="grid grid-cols-2 gap-2 mt-4">
                                        <Button variant="outline" onClick={downloadSelectedHistory} disabled={selectedHistory.size === 0}><Download/>Download Selected</Button>
                                        <Button variant="destructive" onClick={deleteSelectedHistory} disabled={selectedHistory.size === 0}><Trash2/>Delete Selected</Button>
                                        <Button variant="destructive" className="col-span-2" onClick={() => {setSchemaHistory([]); setSelectedHistory(new Set())}}><Trash2 />Clear All History</Button>
                                    </div>
                                }
                            </CardContent>
                        </MotionCard>
                    </div>
                </div>
            </main>
        </div>
    );
}
