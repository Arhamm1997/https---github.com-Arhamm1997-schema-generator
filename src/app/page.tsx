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
import { cleanObject, validateFormData, validateSchema } from '@/lib/utils';
import { SlidersHorizontal, Code, History, Copy, Trash2, Download, CircleCheck, Wand2, Bot, Link, MapPin, Clock, Star, Image, Type, Heading1, Plus, X, User, Building, Calendar, FileText, List } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { generateSchemaFromUrl } from '@/ai/flows/generate-schema-from-url';
import { Checkbox } from '@/components/ui/checkbox';
import CelebrationEffect from '@/components/CelebrationEffect';
import WelcomeMessage from '@/components/WelcomeMessage';
import SettingsDialog from '@/components/SettingsDialog';
// Import will be dynamic to avoid build issues

const MotionCard = motion(Card);

const Header = ({ onSettingsClick }: { onSettingsClick: () => void }) => (
  <motion.header 
    initial={{ y: -100, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ duration: 0.5, ease: 'easeOut' }}
    className="mt-8 py-8 text-center relative"
  >
    <div className="max-w-7xl mx-auto px-6">
      <div className="absolute top-4 right-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onSettingsClick}
          className="flex items-center gap-2 hover:bg-primary/10"
        >
          <SlidersHorizontal className="h-4 w-4" />
          AI Settings
        </Button>
      </div>
      <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mb-3 tracking-tighter flex items-center justify-center gap-4">
        <Wand2 size={40} className="text-primary animate-float" /> Voice Schema Generator
      </h1>
      <p className="text-lg text-muted-foreground font-medium">AI-powered schema markup for superior voice search visibility and local SEO with intelligent address & pricing detection.</p>
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

        // Check if any AI providers are configured and get their configs
        let availableProviders: string[] = [];
        let providerConfigs: Record<string, any> = {};
        try {
            const { aiProviderManager } = await import('@/ai/providers');
            availableProviders = aiProviderManager.getAvailableProviders();
            
            // Get all provider configs to pass to the server
            const allProviders = ['gemini', 'openai', 'claude'];
            for (const provider of allProviders) {
                const config = aiProviderManager.getProviderConfig(provider as any);
                if (config) {
                    providerConfigs[provider] = config;
                }
            }
            
            if (availableProviders.length === 0) {
                toast({ 
                    variant: 'destructive', 
                    title: 'No AI Provider Configured', 
                    description: 'Please configure at least one AI provider in Settings to generate schemas.' 
                });
                return;
            }
        } catch (error) {
            // Provider manager not available, will use fallback
            console.log('Using fallback Gemini provider');
        }

        setIsLoading(true);
        try {
            const result = await generateSchemaFromUrl({ url, providerConfigs });
            const schemaString = `<script type="application/ld+json">\n${JSON.stringify(result.schema, null, 2)}\n</script>`;
            const name = result.schema.mainEntity?.name || result.schema.name || new URL(url).hostname;
            onSchemaGenerated(schemaString, name);
            
            let providerName = 'AI Provider';
            try {
                const { aiProviderManager } = await import('@/ai/providers');
                const activeProvider = aiProviderManager.getActiveProvider();
                providerName = aiProviderManager.getProviderConfig(activeProvider)?.displayName || activeProvider;
            } catch (error) {
                providerName = 'Gemini (Default)';
            }
            
            toast({ 
                title: 'Enhanced Schema Generated!', 
                description: `Comprehensive schema generated using ${providerName} with intelligent address & price detection.`,
                duration: 6000
            });
        } catch (error) {
            console.error('Error generating schema from URL:', error);
            toast({ 
                variant: 'destructive', 
                title: 'Generation Failed', 
                description: 'Could not generate schema from the provided URL. Please check the URL and AI provider settings, then try again.' 
            });
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
                <CardTitle className="flex items-center gap-3 text-2xl">
                    <Link className="text-accent" /> 
                    AI-Powered Schema Extractor
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground mb-4 text-sm">
                    Enter a URL to automatically extract and generate comprehensive schema markup with intelligent postal code detection and city-based price range estimation.
                </p>
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
                    <Button onClick={handleGenerate} disabled={isLoading} className="bg-primary hover:bg-primary/90 text-primary-foreground h-11 px-6 py-2.5 rounded-xl font-semibold text-base shadow-lg">
                        {isLoading ? (
                            <motion.div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin mr-2" />
                        ) : (
                            <Wand2 className="mr-2 h-4 w-4" />
                        )}
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

const ImageManager = ({ images, setImages }: { images: string[], setImages: (images: string[]) => void }) => {
    const [newImageUrl, setNewImageUrl] = useState('');

    const addImage = () => {
        if (newImageUrl && !images.includes(newImageUrl)) {
            setImages([...images, newImageUrl]);
            setNewImageUrl('');
        }
    };

    const removeImage = (index: number) => {
        setImages(images.filter((_, i) => i !== index));
    };

    return (
        <div className="space-y-3">
            <div className="flex gap-2">
                <Input 
                    placeholder="Enter image URL" 
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    className="bg-background border-border"
                />
                <Button onClick={addImage} size="sm" variant="outline">
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
            <div className="space-y-2">
                {images.map((image, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-muted/20 rounded">
                        <Image className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 text-sm truncate">{image}</span>
                        <Button 
                            onClick={() => removeImage(index)} 
                            size="sm" 
                            variant="ghost"
                            className="h-6 w-6 p-0"
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
};

const HowToStepsManager = ({ steps, setSteps }: { steps: string[], setSteps: (steps: string[]) => void }) => {
    const [newStep, setNewStep] = useState('');

    const addStep = () => {
        if (newStep.trim()) {
            setSteps([...steps, newStep.trim()]);
            setNewStep('');
        }
    };

    const removeStep = (index: number) => {
        setSteps(steps.filter((_, i) => i !== index));
    };

    const updateStep = (index: number, value: string) => {
        const updatedSteps = [...steps];
        updatedSteps[index] = value;
        setSteps(updatedSteps);
    };

    return (
        <div className="space-y-3">
            <div className="flex gap-2">
                <Input 
                    placeholder="Enter step description" 
                    value={newStep}
                    onChange={(e) => setNewStep(e.target.value)}
                    className="bg-background border-border"
                />
                <Button onClick={addStep} size="sm" variant="outline">
                    <Plus className="h-4 w-4" />
                </Button>
            </div>
            <div className="space-y-2">
                {steps.map((step, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-muted/20 rounded">
                        <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                            {index + 1}
                        </span>
                        <Input 
                            value={step}
                            onChange={(e) => updateStep(index, e.target.value)}
                            className="flex-1 bg-transparent border-none p-0"
                        />
                        <Button 
                            onClick={() => removeStep(index)} 
                            size="sm" 
                            variant="ghost"
                            className="h-6 w-6 p-0"
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
};

const BasicInfoTab = ({ formData, handleChange, handleSelectChange, images, setImages, howToSteps, setHowToSteps }: any) => {
    const contentType = formData.contentType || 'LocalBusiness';

    return (
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
            <FormField id="contentType" label="Content Type" type="select" tooltip="Choose the type of content for appropriate schema">
                <Select name="contentType" onValueChange={(value) => handleSelectChange('contentType', value)} value={contentType}>
                    <SelectTrigger className="bg-background border-border focus:ring-ring focus:ring-2">
                        <SelectValue placeholder="Select Content Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="LocalBusiness">Local Business</SelectItem>
                        <SelectItem value="Restaurant">Restaurant</SelectItem>
                        <SelectItem value="HVACBusiness">HVAC Business</SelectItem>
                        <SelectItem value="ProfessionalService">Professional Service</SelectItem>
                        <SelectItem value="HomeAndConstructionBusiness">Home & Construction</SelectItem>
                        <SelectItem value="MedicalBusiness">Medical Business</SelectItem>
                        <SelectItem value="LegalService">Legal Service</SelectItem>
                        <SelectItem value="AutomotiveBusiness">Automotive Business</SelectItem>
                        <SelectItem value="Article">Article</SelectItem>
                        <SelectItem value="HowTo">How-To Guide</SelectItem>
                    </SelectContent>
                </Select>
            </FormField>

            <div className="bg-muted/20 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-semibold text-muted-foreground mb-4 flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    Content Information
                </h3>
                
                {contentType === 'Article' ? (
                    <>
                        <FormField 
                            id="headline" 
                            name="headline" 
                            label="Article Headline" 
                            placeholder="Your Article Headline" 
                            value={formData.headline} 
                            onChange={handleChange} 
                            icon={Heading1}
                            tooltip="The main headline of your article"
                        />
                        <div className="grid md:grid-cols-2 gap-4">
                            <FormField 
                                id="authorName" 
                                name="authorName" 
                                label="Author Name" 
                                placeholder="John Doe" 
                                value={formData.authorName} 
                                onChange={handleChange} 
                                icon={User}
                                tooltip="The name of the article author"
                            />
                            <FormField 
                                id="authorType" 
                                name="authorType" 
                                label="Author Type" 
                                type="select"
                                tooltip="Type of author entity"
                            >
                                <Select name="authorType" onValueChange={(value) => handleSelectChange('authorType', value)} value={formData.authorType || 'Person'}>
                                    <SelectTrigger className="bg-background border-border">
                                        <SelectValue placeholder="Select Author Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Person">Person</SelectItem>
                                        <SelectItem value="Organization">Organization</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormField>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <FormField 
                                id="publisherName" 
                                name="publisherName" 
                                label="Publisher Name" 
                                placeholder="Your Website Name" 
                                value={formData.publisherName} 
                                onChange={handleChange} 
                                icon={Building}
                                tooltip="The name of the publishing organization"
                            />
                            <FormField 
                                id="publisherLogoUrl" 
                                name="publisherLogoUrl" 
                                label="Publisher Logo URL" 
                                type="url"
                                placeholder="https://yoursite.com/logo.png" 
                                value={formData.publisherLogoUrl} 
                                onChange={handleChange} 
                                icon={Image}
                                tooltip="URL to your organization's logo"
                            />
                        </div>
                        <FormField 
                            id="datePublished" 
                            name="datePublished" 
                            label="Date Published" 
                            type="datetime-local"
                            value={formData.datePublished} 
                            onChange={handleChange} 
                            icon={Calendar}
                            tooltip="When the article was first published"
                        />
                        <FormField 
                            id="dateModified" 
                            name="dateModified" 
                            label="Date Modified" 
                            type="datetime-local"
                            value={formData.dateModified} 
                            onChange={handleChange} 
                            icon={Calendar}
                            tooltip="When the article was last updated"
                        />
                    </>
                ) : contentType === 'HowTo' ? (
                    <>
                        <FormField 
                            id="howToName" 
                            name="howToName" 
                            label="How-To Title" 
                            placeholder="How to..." 
                            value={formData.howToName} 
                            onChange={handleChange} 
                            icon={FileText}
                            tooltip="The title of your how-to guide"
                        />
                        <FormField 
                            id="howToDescription" 
                            name="howToDescription" 
                            label="How-To Description" 
                            type="textarea"
                            rows={3}
                            placeholder="Brief description of what this guide teaches..." 
                            value={formData.howToDescription} 
                            onChange={handleChange} 
                            tooltip="Short description of what users will learn"
                        />
                        <div>
                            <label className="flex items-center text-sm font-medium text-muted-foreground mb-2">
                                <List className="mr-2 h-4 w-4 text-primary/80" />
                                How-To Steps
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Bot className="ml-2 h-4 w-4 cursor-help text-muted-foreground/50"/>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>Add step-by-step instructions</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </label>
                            <HowToStepsManager steps={howToSteps} setSteps={setHowToSteps} />
                        </div>
                    </>
                ) : (
                    <>
                        <FormField 
                            id="pageTitle" 
                            name="pageTitle" 
                            label="Page Title" 
                            placeholder="Your Page Title" 
                            value={formData.pageTitle} 
                            onChange={handleChange} 
                            icon={Type}
                            tooltip="The main title of your page (used in schema and meta tags)"
                        />
                        <FormField 
                            id="pageH1" 
                            name="pageH1" 
                            label="Main Heading (H1)" 
                            placeholder="Your Main Heading" 
                            value={formData.pageH1} 
                            onChange={handleChange} 
                            icon={Heading1}
                            tooltip="The primary heading visible on your page"
                        />
                    </>
                )}

                <div>
                    <label className="flex items-center text-sm font-medium text-muted-foreground mb-2">
                        <Image className="mr-2 h-4 w-4 text-primary/80" />
                        Images
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Bot className="ml-2 h-4 w-4 cursor-help text-muted-foreground/50"/>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Add multiple images for your content</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </label>
                    <ImageManager images={images} setImages={setImages} />
                </div>
            </div>

            {(contentType !== 'Article' && contentType !== 'HowTo') && (
                <>
                    <div className="grid md:grid-cols-2 gap-4">
                        <FormField id="name" name="name" label="Business Name" placeholder="Your Business Name" value={formData.name} onChange={handleChange} tooltip="Your official business name as registered" />
                        <FormField id="websiteUrl" name="websiteUrl" label="Website URL" placeholder="https://yourbusiness.com" value={formData.websiteUrl} onChange={handleChange} tooltip="Your main website URL"/>
                    </div>
                    <FormField id="description" name="description" label="Business Description" type="textarea" rows={3} placeholder="Describe your business in a conversational tone..." tooltip="Keep it conversational and natural for voice search (20-30 words ideal)" value={formData.description} onChange={handleChange}/>
                    <div className="grid md:grid-cols-2 gap-4">
                        <FormField id="telephone" name="telephone" label="Phone Number" placeholder="+1-555-123-4567" value={formData.telephone} onChange={handleChange} tooltip="Primary business phone number"/>
                        <FormField id="email" name="email" label="Email Address" placeholder="info@yourbusiness.com" value={formData.email} onChange={handleChange} tooltip="Main business email address"/>
                    </div>
                    <FormField id="streetAddress" name="streetAddress" label="Street Address" placeholder="123 Main Street" value={formData.streetAddress} onChange={handleChange} icon={MapPin}/>
                    <div className="grid md:grid-cols-2 gap-4">
                        <FormField id="addressLocality" name="addressLocality" label="City" placeholder="Your City" value={formData.addressLocality} onChange={handleChange}/>
                        <FormField id="addressRegion" name="addressRegion" label="State/Region" placeholder="State" value={formData.addressRegion} onChange={handleChange}/>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <FormField id="postalCode" name="postalCode" label="Postal Code" placeholder="12345" value={formData.postalCode} onChange={handleChange} tooltip="Auto-detected from AI extraction or manually entered"/>
                        <FormField id="addressCountry" name="addressCountry" label="Country" placeholder="US" value={formData.addressCountry} onChange={handleChange}/>
                    </div>
                </>
            )}
        </motion.div>
    );
};

const LocalSeoTab = ({ formData, handleChange }: any) => {
    const contentType = formData.contentType || 'LocalBusiness';
    
    if (contentType === 'Article' || contentType === 'HowTo') {
        return (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
                <div className="text-center py-8 text-muted-foreground">
                    <MapPin size={40} className="mx-auto mb-4" />
                    <p>Local SEO settings are not applicable for {contentType} content type.</p>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
            <FormField 
                id="businessHours" 
                name="businessHours" 
                label="Business Hours" 
                type="textarea" 
                rows={3} 
                placeholder="Monday-Friday: 9AM-5PM&#10;Saturday: 10AM-3PM&#10;Sunday: Closed" 
                value={formData.businessHours} 
                onChange={handleChange}
                icon={Clock}
                tooltip="Format each day on a new line for best results"
            />
            <div className="grid md:grid-cols-2 gap-4">
                <FormField id="latitude" name="latitude" label="Latitude" type="number" step="any" placeholder="40.7128" value={formData.latitude} onChange={handleChange} tooltip="GPS coordinates help with local search"/>
                <FormField id="longitude" name="longitude" label="Longitude" type="number" step="any" placeholder="-74.0060" value={formData.longitude} onChange={handleChange}/>
            </div>
            <FormField id="googleMap" name="googleMap" label="Google Maps URL" type="url" placeholder="https://maps.google.com/..." value={formData.googleMap} onChange={handleChange} icon={MapPin}/>
            <FormField id="serviceAreas" name="serviceAreas" label="Service Areas" placeholder="Downtown, Midtown, Suburbs, City Name" value={formData.serviceAreas} onChange={handleChange} tooltip="Areas you serve - important for 'near me' searches"/>
            <div className="grid md:grid-cols-2 gap-4">
                <FormField id="ratingValue" name="ratingValue" label="Average Rating (1-5)" type="number" placeholder="4.8" min="1" max="5" step="0.1" value={formData.ratingValue} onChange={handleChange} icon={Star}/>
                <FormField id="reviewCount" name="reviewCount" label="Total Reviews" type="number" placeholder="127" value={formData.reviewCount} onChange={handleChange}/>
            </div>
            <FormField id="priceRange" name="priceRange" label="Price Range" placeholder="$$ (Auto-detected by city)" value={formData.priceRange} onChange={handleChange} tooltip="AI detects price range based on location and content. Use $ to $$$$ format"/>
            <FormField id="servicesOffered" name="servicesOffered" label="Services Offered" type="textarea" rows={4} placeholder="Service 1&#10;Service 2&#10;Service 3" value={formData.servicesOffered} onChange={handleChange} tooltip="List each service on a new line"/>
        </motion.div>
    );
};

const VoiceSearchTab = ({ formData, handleChange }: any) => (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}>
        <FormField id="voiceSummary" name="voiceSummary" label="Voice Search Summary" type="textarea" rows={2} placeholder="Brief summary perfect for voice assistants (20-30 words)..." tooltip="This will be used for voice search results" value={formData.voiceSummary} onChange={handleChange}/>
        <FormField id="voiceKeywords" name="voiceKeywords" label="Voice Search Keywords" placeholder="near me, best, top rated, how to, what is, local" value={formData.voiceKeywords} onChange={handleChange} tooltip="Keywords people use in voice searches"/>
        <FormField id="faqQuestions" name="faqQuestions" label="Frequently Asked Questions" type="textarea" rows={6} placeholder="What are your hours?&#10;Where are you located?&#10;Do you offer free estimates?&#10;How can I contact you?&#10;What services do you provide?&#10;Do you accept insurance?" value={formData.faqQuestions} onChange={handleChange} tooltip="Questions customers commonly ask - one per line"/>
        <FormField id="faqAnswers" name="faqAnswers" label="FAQ Answers" type="textarea" rows={6} placeholder="We're open Monday-Friday 9AM-5PM&#10;We're located at [Your Address]&#10;Yes, we provide free estimates&#10;Call us at [Phone] or email [Email]&#10;We offer [list services]&#10;Yes, we accept most major insurance plans" value={formData.faqAnswers} onChange={handleChange} tooltip="Answers to FAQs - match the order of questions above"/>
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
            <FormField id="alternativeNames" name="alternativeNames" label="Alternative Names" placeholder="Also known as, DBA names, etc." value={formData.alternativeNames} onChange={handleChange} tooltip="Other names your content/business is known by"/>
            <FormField id="foundingDate" name="foundingDate" label="Founding Date" type="date" value={formData.foundingDate} onChange={handleChange} tooltip="When your business was established"/>
            <FormField id="paymentMethods" name="paymentMethods" label="Payment Methods Accepted" placeholder="Cash, Credit Card, PayPal, etc." value={formData.paymentMethods} onChange={handleChange}/>
            
            <div className="form-group">
                <label htmlFor="socialSelect" className="flex items-center text-sm font-medium text-muted-foreground">
                    <i className="fas fa-share-alt mr-2 text-primary"></i>Social Media Profiles
                </label>
                <div className="flex gap-2">
                    <Input placeholder="Enter full profile URL (e.g., https://facebook.com/yourbiz)" value={socialUrl} onChange={(e) => setSocialUrl(e.target.value)} className="bg-background border-border" />
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
            
            <FormField id="awards" name="awards" label="Awards & Certifications" type="textarea" rows={3} placeholder="Best Service Award 2023&#10;BBB Accredited Business&#10;Industry Certification" value={formData.awards} onChange={handleChange} tooltip="Awards, certifications, and recognitions"/>
            <FormField id="specialOffers" name="specialOffers" label="Special Offers" type="textarea" rows={2} placeholder="Free consultation, 10% off first service, etc." value={formData.specialOffers} onChange={handleChange}/>
        </motion.div>
    );
};

const TABS = {
    'basic': 'Basic Info',
    'local': 'Local SEO',
    'voice': 'Voice Search',
    'advanced': 'Advanced',
};

export default function Home() {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState('basic');
    const [generatedSchema, setGeneratedSchema] = useState('');
    const [schemaHistory, setSchemaHistory] = useLocalStorage<HistoryItem[]>('schemaHistory', []);
    const [socialProfiles, setSocialProfiles] = useLocalStorage<string[]>('socialProfiles', []);
    const [images, setImages] = useLocalStorage<string[]>('images', []);
    const [howToSteps, setHowToSteps] = useLocalStorage<string[]>('howToSteps', []);
    const [selectedHistory, setSelectedHistory] = useState<Set<string>>(new Set());
    const [isMounted, setIsMounted] = useState(false);
    const [isAiGenerated, setIsAiGenerated] = useState(false);
    const [showSchemaCelebration, setShowSchemaCelebration] = useState(false);
    const [showWelcome, setShowWelcome] = useState(false);
    const [showWelcomeCelebration, setShowWelcomeCelebration] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    
    useEffect(() => {
        setIsMounted(true);
        // Show welcome message on every page refresh
        setShowWelcome(true);
        setShowWelcomeCelebration(true);
    }, []);

    const [formData, setFormData] = useLocalStorage('formData', {
        contentType: 'LocalBusiness',
        name: '', 
        websiteUrl: '', 
        description: '', 
        pageTitle: '',
        pageH1: '',
        headline: '',
        authorName: '',
        authorType: 'Person',
        publisherName: '',
        publisherLogoUrl: '',
        datePublished: '',
        dateModified: '',
        howToName: '',
        howToDescription: '',
        telephone: '', 
        email: '', 
        streetAddress: '', 
        addressLocality: '', 
        addressRegion: '', 
        postalCode: '', 
        addressCountry: 'US', 
        voiceSummary: '', 
        voiceKeywords: 'near me, best, top rated, local, professional', 
        faqQuestions: 'What are your hours?\nWhere are you located?\nDo you offer free estimates?\nHow can I contact you?\nWhat services do you provide?', 
        faqAnswers: 'We are open Monday-Friday 9AM-5PM\nWe are located at [Your Address]\nYes, we provide free estimates\nCall us at [Phone] or email [Email]\nWe offer [list your services]',
        serviceAreas: '', 
        ratingValue: '', 
        reviewCount: '', 
        latitude: '', 
        longitude: '', 
        googleMap: '', 
        servicesOffered: '',
        businessHours: '',
        priceRange: '',
        alternativeNames: '',
        foundingDate: '',
        paymentMethods: '',
        awards: '',
        specialOffers: ''
    });

    const handleAiSchemaGenerated = (schema: string, name: string) => {
        setGeneratedSchema(schema);
        setIsAiGenerated(true);
        setShowSchemaCelebration(true);
        
        // Parse the schema to extract useful data for the form
        try {
            const scriptMatch = schema.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/);
            if (scriptMatch) {
                const schemaObject = JSON.parse(scriptMatch[1]);
                const mainEntity = schemaObject.mainEntity || schemaObject;
                
                // Auto-populate form fields from the extracted schema
                const updateData: any = { ...formData };
                
                if (mainEntity.name) updateData.name = mainEntity.name;
                if (mainEntity.description) updateData.description = mainEntity.description;
                if (mainEntity.url) updateData.websiteUrl = mainEntity.url;
                if (mainEntity.telephone) updateData.telephone = mainEntity.telephone;
                if (mainEntity.email) updateData.email = mainEntity.email;
                if (mainEntity.priceRange) updateData.priceRange = mainEntity.priceRange;
                
                if (mainEntity.address) {
                    if (mainEntity.address.streetAddress) updateData.streetAddress = mainEntity.address.streetAddress;
                    if (mainEntity.address.addressLocality) updateData.addressLocality = mainEntity.address.addressLocality;
                    if (mainEntity.address.addressRegion) updateData.addressRegion = mainEntity.address.addressRegion;
                    if (mainEntity.address.postalCode) updateData.postalCode = mainEntity.address.postalCode;
                    if (mainEntity.address.addressCountry) updateData.addressCountry = mainEntity.address.addressCountry;
                }
                
                if (mainEntity.geo) {
                    if (mainEntity.geo.latitude) updateData.latitude = mainEntity.geo.latitude.toString();
                    if (mainEntity.geo.longitude) updateData.longitude = mainEntity.geo.longitude.toString();
                }
                
                if (mainEntity.aggregateRating) {
                    if (mainEntity.aggregateRating.ratingValue) updateData.ratingValue = mainEntity.aggregateRating.ratingValue.toString();
                    if (mainEntity.aggregateRating.reviewCount) updateData.reviewCount = mainEntity.aggregateRating.reviewCount.toString();
                }
                
                setFormData(updateData);
                
                // Update social profiles if found
                if (mainEntity.sameAs && Array.isArray(mainEntity.sameAs)) {
                    setSocialProfiles(mainEntity.sameAs);
                }
                
                // Update images if found
                if (mainEntity.image && Array.isArray(mainEntity.image)) {
                    const imageUrls = mainEntity.image.map((img: any) => typeof img === 'string' ? img : img.url).filter(Boolean);
                    setImages(imageUrls);
                } else if (mainEntity.logo && typeof mainEntity.logo === 'object' && mainEntity.logo.url) {
                    setImages([mainEntity.logo.url]);
                }
            }
        } catch (error) {
            console.error('Error parsing generated schema for form population:', error);
        }
        
        const newHistoryItem: HistoryItem = {
            id: Date.now().toString(),
            name: name || 'AI Generated Schema',
            timestamp: new Date().toLocaleString(),
            schema: schema
        };
        setSchemaHistory(prev => [newHistoryItem, ...prev].slice(0, 10));
    };

    const handleWelcomeClose = () => {
        setShowWelcome(false);
    };

    const handleWelcomeCelebrationComplete = () => {
        setShowWelcomeCelebration(false);
    };

    const handleSchemaCelebrationComplete = () => {
        setShowSchemaCelebration(false);
    };

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: value }));
        setIsAiGenerated(false);
    }, [setFormData]);

    const handleSelectChange = useCallback((name: string, value: string) => {
        setFormData((prev: any) => ({ ...prev, [name]: value }));
        setIsAiGenerated(false);
    }, [setFormData]);

    const generateSchema = useCallback(() => {
        const contentType = formData.contentType || 'LocalBusiness';

        const validation = validateFormData(formData, isAiGenerated);
        if (!validation.isValid) {
            toast({ 
                variant: 'destructive', 
                title: 'Validation Error', 
                description: validation.errors.join(', ') 
            });
            setActiveTab('basic');
            return;
        }

        const cleanedFormData = validation.cleanedData;

        if (contentType === 'Article') {
            const articleSchema = {
                "@context": "https://schema.org",
                "@type": "Article",
                "headline": cleanedFormData.headline,
                "author": {
                    "@type": cleanedFormData.authorType || 'Person',
                    "name": cleanedFormData.authorName
                },
                "publisher": {
                    "@type": "Organization",
                    "name": cleanedFormData.publisherName,
                    "logo": cleanedFormData.publisherLogoUrl ? {
                        "@type": "ImageObject",
                        "url": cleanedFormData.publisherLogoUrl
                    } : undefined
                },
                "datePublished": cleanedFormData.datePublished || new Date().toISOString(),
                "dateModified": cleanedFormData.dateModified || cleanedFormData.datePublished || new Date().toISOString(),
                "image": images.length > 0 ? images.map(img => ({
                    "@type": "ImageObject",
                    "url": img
                })) : undefined,
                "description": cleanedFormData.voiceSummary || cleanedFormData.howToDescription,
                "keywords": cleanedFormData.voiceKeywords
            };

            const cleanedSchema = cleanObject(articleSchema);
            const schemaValidation = validateSchema(cleanedSchema);
            if (!schemaValidation.isValid) {
                toast({ 
                    variant: 'destructive', 
                    title: 'Schema Validation Error', 
                    description: schemaValidation.errors.join(', ') 
                });
                return;
            }

            const fullScript = `<script type="application/ld+json">\n${JSON.stringify(cleanedSchema, null, 2)}\n</script>`;
            setGeneratedSchema(fullScript);

        } else if (contentType === 'HowTo') {
            if (howToSteps.length === 0) {
                toast({ variant: 'destructive', title: 'Missing Information', description: 'Please add at least one step to your how-to guide.' });
                setActiveTab('basic');
                return;
            }

            const howToSchema = {
                "@context": "https://schema.org/",
                "@type": "HowTo",
                "name": cleanedFormData.howToName,
                "description": cleanedFormData.howToDescription,
                "image": images.length > 0 ? images.map(img => ({
                    "@type": "ImageObject",
                    "url": img
                })) : undefined,
                "step": howToSteps.map((step, index) => ({
                    "@type": "HowToStep",
                    "position": index + 1,
                    "text": step
                }))
            };

            const cleanedSchema = cleanObject(howToSchema);
            const schemaValidation = validateSchema(cleanedSchema);
            if (!schemaValidation.isValid) {
                toast({ 
                    variant: 'destructive', 
                    title: 'Schema Validation Error', 
                    description: schemaValidation.errors.join(', ') 
                });
                return;
            }

            const fullScript = `<script type="application/ld+json">\n${JSON.stringify(cleanedSchema, null, 2)}\n</script>`;
            setGeneratedSchema(fullScript);

        } else {
            if (!isAiGenerated) {
                if (!cleanedFormData.streetAddress || !cleanedFormData.addressLocality || !cleanedFormData.addressRegion) {
                    toast({ variant: 'destructive', title: 'Missing Address Information', description: 'Please provide complete address information or use AI generation to auto-detect address details.' });
                    setActiveTab('local');
                    return;
                }
            }

            const baseSchema = {
                "@context": "https://schema.org",
                "@type": "WebPage",
                "url": cleanedFormData.websiteUrl,
                "name": cleanedFormData.pageTitle || cleanedFormData.name,
                "headline": cleanedFormData.pageH1 || cleanedFormData.pageTitle || cleanedFormData.name,
            };

            if (images.length > 0) {
                baseSchema.image = images.map(img => ({
                    "@type": "ImageObject",
                    "url": img,
                    "name": cleanedFormData.pageTitle || cleanedFormData.name
                }));
            }

            const mainEntity: any = {
                "@type": contentType,
                "name": cleanedFormData.name,
                "description": cleanedFormData.description,
                "url": cleanedFormData.websiteUrl,
                "telephone": cleanedFormData.telephone,
                "address": {
                    "@type": "PostalAddress",
                    "streetAddress": cleanedFormData.streetAddress,
                    "addressLocality": cleanedFormData.addressLocality,
                    "addressRegion": cleanedFormData.addressRegion,
                    "postalCode": cleanedFormData.postalCode,
                    "addressCountry": cleanedFormData.addressCountry || "US"
                },
            };

            if (images.length > 0) {
                mainEntity.logo = {
                    "@type": "ImageObject",
                    "url": images[0]
                };
                mainEntity.image = images.map(img => ({
                    "@type": "ImageObject",
                    "url": img,
                    "name": cleanedFormData.name
                }));
            }

            if (cleanedFormData.faqQuestions && cleanedFormData.faqAnswers) {
                const questions = cleanedFormData.faqQuestions.split('\n').filter(q => q.trim());
                const answers = cleanedFormData.faqAnswers.split('\n').filter(a => a.trim());
                
                if (questions.length > 0) {
                    const faqEntity = questions.map((question, index) => ({
                        "@type": "Question",
                        "name": question.trim(),
                        "acceptedAnswer": {
                            "@type": "Answer",
                            "text": answers[index]?.trim() || `Contact us at ${cleanedFormData.telephone || 'our phone number'} for more information.`
                        }
                    }));
                    
                    if (faqEntity.length > 0) {
                        mainEntity.mainEntityOfPage = {
                            "@type": "FAQPage",
                            "mainEntity": faqEntity
                        };
                    }
                }
            }

            let openingHours = undefined;
            if (cleanedFormData.businessHours) {
                const hoursLines = cleanedFormData.businessHours.split('\n').filter(line => line.trim());
                openingHours = hoursLines.map(line => {
                    const parts = line.split(':');
                    if (parts.length >= 2) {
                        const dayOfWeek = parts[0].trim();
                        const timeRange = parts[1].trim();
                        const [opens, closes] = timeRange.split('-').map(t => t.trim());
                        
                        if (opens && closes) {
                            return {
                                "@type": "OpeningHoursSpecification",
                                "dayOfWeek": dayOfWeek,
                                "opens": opens,
                                "closes": closes
                            };
                        }
                    }
                    return null;
                }).filter(Boolean);
            }

            const cleanedMainEntity = cleanObject({
                ...mainEntity,
                email: cleanedFormData.email,
                priceRange: cleanedFormData.priceRange,
                paymentAccepted: cleanedFormData.paymentMethods ? cleanedFormData.paymentMethods.split(',').map(p => p.trim()) : undefined,
                foundingDate: cleanedFormData.foundingDate,
                alternateName: cleanedFormData.alternativeNames ? cleanedFormData.alternativeNames.split(',').map(n => n.trim()) : undefined,
                openingHoursSpecification: openingHours,
                geo: (cleanedFormData.latitude && cleanedFormData.longitude) ? { 
                    "@type": "GeoCoordinates", 
                    latitude: parseFloat(cleanedFormData.latitude), 
                    longitude: parseFloat(cleanedFormData.longitude) 
                } : undefined,
                hasMap: cleanedFormData.googleMap,
                aggregateRating: (cleanedFormData.ratingValue && cleanedFormData.reviewCount) ? { 
                    "@type": "AggregateRating", 
                    ratingValue: parseFloat(cleanedFormData.ratingValue), 
                    reviewCount: parseInt(cleanedFormData.reviewCount),
                    bestRating: "5",
                    worstRating: "1"
                } : undefined,
                areaServed: cleanedFormData.serviceAreas ? cleanedFormData.serviceAreas.split(',').map(area => ({ 
                    "@type": "Place", 
                    "name": area.trim() 
                })) : undefined,
                makesOffer: cleanedFormData.servicesOffered ? cleanedFormData.servicesOffered.split('\n').filter(s => s.trim()).map(s => ({ 
                    "@type": "Offer", 
                    "itemOffered": { 
                        "@type": "Service", 
                        "name": s.trim() 
                    }
                })) : undefined,
                hasOfferCatalog: cleanedFormData.specialOffers ? {
                    "@type": "OfferCatalog",
                    "name": "Special Offers",
                    "itemListElement": cleanedFormData.specialOffers.split('\n').filter(o => o.trim()).map(offer => ({
                        "@type": "Offer",
                        "name": offer.trim()
                    }))
                } : undefined,
                award: cleanedFormData.awards ? cleanedFormData.awards.split('\n').filter(a => a.trim()) : undefined,
                sameAs: socialProfiles.length > 0 ? socialProfiles : undefined,
            });
            
            const finalSchema = {
                ...baseSchema,
                mainEntity: cleanedMainEntity,
                keywords: cleanedFormData.voiceKeywords,
                description: cleanedFormData.voiceSummary || cleanedFormData.description,
            };

            const cleanedFinalSchema = cleanObject(finalSchema);
            const schemaValidation = validateSchema(cleanedFinalSchema);
            if (!schemaValidation.isValid) {
                console.warn('Schema validation warnings:', schemaValidation.errors);
            }

            const fullScript = `<script type="application/ld+json">\n${JSON.stringify(cleanedFinalSchema, null, 2)}\n</script>`;
            setGeneratedSchema(fullScript);
        }
        
        const newHistoryItem: HistoryItem = {
            id: Date.now().toString(),
            name: cleanedFormData.name || cleanedFormData.headline || cleanedFormData.howToName || 'Untitled Schema',
            timestamp: new Date().toLocaleString(),
            schema: generatedSchema
        };
        setSchemaHistory(prev => [newHistoryItem, ...prev].slice(0, 10));

        setShowSchemaCelebration(true);
        toast({ title: 'Enhanced Schema Generated!', description: 'Your comprehensive schema with intelligent address & price detection is ready.' });
    }, [formData, socialProfiles, images, howToSteps, toast, setSchemaHistory, generatedSchema, isAiGenerated]);

    const copySchema = () => {
        if (!generatedSchema) {
            toast({ variant: 'destructive', title: 'Nothing to Copy', description: 'Please generate a schema first.' });
            return;
        }
        navigator.clipboard.writeText(generatedSchema);
        toast({ title: 'Copied to clipboard!', description: 'Your schema is now in your clipboard.', icon: <Copy className="h-4 w-4" /> });
    };
    
    const validateSchemaResult = () => {
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
        setFormData({ 
            contentType: 'LocalBusiness',
            name: '', 
            websiteUrl: '', 
            description: '', 
            pageTitle: '',
            pageH1: '',
            headline: '',
            authorName: '',
            authorType: 'Person',
            publisherName: '',
            publisherLogoUrl: '',
            datePublished: '',
            dateModified: '',
            howToName: '',
            howToDescription: '',
            telephone: '', 
            email: '', 
            streetAddress: '', 
            addressLocality: '', 
            addressRegion: '', 
            postalCode: '', 
            addressCountry: 'US', 
            voiceSummary: '', 
            voiceKeywords: 'near me, best, top rated, local, professional', 
            faqQuestions: 'What are your hours?\nWhere are you located?\nDo you offer free estimates?\nHow can I contact you?\nWhat services do you provide?', 
            faqAnswers: 'We are open Monday-Friday 9AM-5PM\nWe are located at [Your Address]\nYes, we provide free estimates\nCall us at [Phone] or email [Email]\nWe offer [list your services]',
            serviceAreas: '', 
            ratingValue: '', 
            reviewCount: '', 
            latitude: '', 
            longitude: '', 
            googleMap: '', 
            servicesOffered: '',
            businessHours: '',
            priceRange: '',
            alternativeNames: '',
            foundingDate: '',
            paymentMethods: '',
            awards: '',
            specialOffers: ''
        });
        setSocialProfiles([]);
        setImages([]);
        setHowToSteps([]);
        setGeneratedSchema('');
        setIsAiGenerated(false);
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
        case 'basic': return <BasicInfoTab formData={formData} handleChange={handleChange} handleSelectChange={handleSelectChange} images={images} setImages={setImages} howToSteps={howToSteps} setHowToSteps={setHowToSteps} />;
        case 'local': return <LocalSeoTab formData={formData} handleChange={handleChange} />;
        case 'voice': return <VoiceSearchTab formData={formData} handleChange={handleChange} />;
        case 'advanced': return <AdvancedTab formData={formData} handleChange={handleChange} socialProfiles={socialProfiles} setSocialProfiles={setSocialProfiles} />;
        default: return null;
      }
    }, [activeTab, formData, handleChange, handleSelectChange, images, setImages, howToSteps, setHowToSteps, socialProfiles, setSocialProfiles]);

    if (!isMounted) {
        return null;
    }

    return (
        <div className="min-h-screen w-full">
            <Header onSettingsClick={() => setShowSettings(true)} />
            
            <AnimatePresence>
                {showWelcome && (
                    <WelcomeMessage 
                        isVisible={showWelcome} 
                        onClose={handleWelcomeClose}
                    />
                )}
            </AnimatePresence>

            <CelebrationEffect 
                isActive={showWelcomeCelebration} 
                type="welcome"
                onComplete={handleWelcomeCelebrationComplete}
            />
            <CelebrationEffect 
                isActive={showSchemaCelebration} 
                type="schema"
                onComplete={handleSchemaCelebrationComplete}
            />

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
                                <CardTitle className="flex items-center gap-3 text-2xl"><SlidersHorizontal className="text-primary"/>Manual Configuration</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex w-full rounded-lg bg-background p-1 mb-6 border border-border">
                                    {Object.keys(TABS).map((tabId) => (
                                        <button
                                            key={tabId}
                                            onClick={() => setActiveTab(tabId)}
                                            className={`flex-1 p-2.5 rounded-md transition-all duration-200 font-medium text-xs text-muted-foreground relative z-10 flex items-center justify-center gap-2`}
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
                                    <Button onClick={generateSchema} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold col-span-2 h-12 px-6 py-3 text-base"><Wand2 className="mr-2" />Generate Enhanced Schema</Button>
                                    <Button variant="outline" onClick={copySchema} className="h-10 px-4 py-2"><Copy className="mr-2 h-4 w-4"/>Copy</Button>
                                    <Button variant="outline" onClick={validateSchemaResult} className="h-10 px-4 py-2"><CircleCheck className="mr-2 h-4 w-4"/>Validate with Google</Button>
                                    <Button variant="destructive" onClick={resetFields} className="col-span-2 h-10 px-4 py-2"><Trash2 className="mr-2 h-4 w-4"/>Reset All</Button>
                                </div>
                            </CardContent>
                        </MotionCard>
                    </div>

                    <div className="lg:sticky lg:top-8 flex flex-col gap-8">
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
            
            {/* Settings Dialog */}
            <SettingsDialog 
                isOpen={showSettings} 
                onClose={() => setShowSettings(false)} 
            />
        </div>
    );
}
