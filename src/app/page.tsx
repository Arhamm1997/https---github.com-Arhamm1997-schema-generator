
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import useLocalStorage from '@/hooks/use-local-storage';
import type { HistoryItem } from '@/lib/types';
import { cleanObject } from '@/lib/utils';


const Header = () => (
  <header className="py-8 text-center sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-white/10">
    <div className="max-w-7xl mx-auto px-6">
      <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-3 tracking-tighter">
        <i className="fas fa-microphone animate-pulse text-primary drop-shadow-[0_0_8px_hsl(var(--primary))]"></i> Voice Search & Speakable Schema Generator
      </h1>
      <p className="text-lg text-gray-400 font-medium">Generate optimized schema markup for voice search and speakable content - By Arham</p>
    </div>
  </header>
);

const FeatureCard = ({ icon, title, description }: { icon: string; title: string; description: string }) => (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center transition-all duration-300 hover:transform hover:-translate-y-1 hover:bg-white/10 hover:shadow-lg relative overflow-hidden group">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-accent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
        <i className={`${icon} text-4xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-3 block`}></i>
        <h4 className="text-gray-200 font-semibold mb-2">{title}</h4>
        <p className="text-gray-400 text-sm">{description}</p>
    </div>
);


const Tabs = ({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (tab: string) => void }) => {
    const tabs = [
        { id: 'basic', icon: 'fas fa-building', label: 'Basic Info' },
        { id: 'voice', icon: 'fas fa-microphone', label: 'Voice Search' },
        { id: 'advanced', icon: 'fas fa-cog', label: 'Advanced' }
    ];

    return (
        <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 mb-8">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 p-3 rounded-lg transition-all duration-200 font-medium text-sm text-gray-400 relative z-10 flex items-center justify-center gap-2 ${activeTab === tab.id ? 'bg-gradient-to-r from-primary to-blue-600 text-white shadow-md transform -translate-y-px' : 'hover:bg-white/5 hover:text-gray-300'}`}
                >
                    <i className={tab.icon}></i> {tab.label}
                </button>
            ))}
        </div>
    );
};

const FormField = ({ id, label, placeholder, type = 'text', rows, tooltip, children, value, onChange, name, ...props }: any) => (
    <div className="mb-6">
        <label htmlFor={id} className="flex items-center text-sm text-gray-300 mb-2 font-medium">
            <i className="fas fa-info-circle mr-2 text-primary w-4"></i>
            {label}
            {tooltip && (
                <span className="ml-2 cursor-help group relative">
                    <i className="fas fa-info-circle text-gray-500"></i>
                    <span className="absolute bottom-full left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-lg">
                        {tooltip}
                    </span>
                </span>
            )}
        </label>
        {type === 'textarea' ? (
            <Textarea id={id} placeholder={placeholder} rows={rows} value={value} onChange={onChange} name={name} {...props} className="bg-white/5 border-white/10 focus:border-primary focus:bg-white/10" />
        ) : type === 'select' ? (
            children
        ) : (
            <Input id={id} type={type} placeholder={placeholder} value={value} onChange={onChange} name={name} {...props} className="bg-white/5 border-white/10 focus:border-primary focus:bg-white/10" />
        )}
    </div>
);

const BasicInfoTab = ({ formData, handleChange }: any) => (
  <div>
    <FormField id="businessType" label="Business Type" type="select">
        <Select name="businessType" onValueChange={(value) => handleChange({ target: { name: 'businessType', value } })} value={formData.businessType}>
            <SelectTrigger className="bg-white/5 border-white/10 focus:border-primary focus:bg-white/10"><SelectValue placeholder="Select Business Type" /></SelectTrigger>
            <SelectContent>
                <SelectItem value="LocalBusiness">Local Business</SelectItem>
                <SelectItem value="Restaurant">Restaurant</SelectItem>
                <SelectItem value="HVACBusiness">HVAC Business</SelectItem>
                <SelectItem value="ProfessionalService">Professional Service</SelectItem>
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
  </div>
);

const VoiceSearchTab = ({ formData, handleChange }: any) => (
  <div>
    <FormField id="voiceSummary" name="voiceSummary" label="Voice Search Summary" type="textarea" rows={2} placeholder="Brief summary for voice assistants (20-30 words)..." tooltip="20-30 words for voice assistants" value={formData.voiceSummary} onChange={handleChange}/>
    <FormField id="speakableContent" name="speakableContent" label="Speakable Content CSS Selectors" type="textarea" rows={3} placeholder=".business-summary, .contact-info, .hours-info" value={formData.speakableContent} onChange={handleChange}/>
    <FormField id="voiceKeywords" name="voiceKeywords" label="Voice Search Keywords" placeholder="near me, best, top rated, how to, what is" value={formData.voiceKeywords} onChange={handleChange}/>
    <FormField id="faqQuestions" name="faqQuestions" label="Common Voice Questions" type="textarea" rows={4} placeholder={"What are your hours?\nWhere are you located?\nDo you offer free estimates?"} value={formData.faqQuestions} onChange={handleChange}/>
    <FormField id="serviceAreas" name="serviceAreas" label="Service Areas (for 'near me' searches)" placeholder="Downtown, Midtown, Suburbs, City Name" value={formData.serviceAreas} onChange={handleChange}/>
     <div className="grid md:grid-cols-2 gap-4">
        <FormField id="ratingValue" name="ratingValue" label="Rating (1-5)" type="number" placeholder="4.8" min="1" max="5" step="0.1" value={formData.ratingValue} onChange={handleChange}/>
        <FormField id="reviewCount" name="reviewCount" label="Review Count" type="number" placeholder="127" value={formData.reviewCount} onChange={handleChange}/>
    </div>
  </div>
);

const AdvancedTab = ({ formData, handleChange, socialProfiles, setSocialProfiles }: any) => {
    const [socialPlatform, setSocialPlatform] = useState('');
    const [socialUrl, setSocialUrl] = useState('');

    const addSocialProfile = () => {
        if (!socialUrl) return;
        setSocialProfiles([...socialProfiles, socialUrl]);
        setSocialUrl('');
        setSocialPlatform('');
    };

    const removeSocialProfile = (urlToRemove: string) => {
        setSocialProfiles(socialProfiles.filter((url: string) => url !== urlToRemove));
    };

    return (
    <div>
        <div className="grid md:grid-cols-2 gap-4">
            <FormField id="latitude" name="latitude" label="Latitude" type="number" step="any" placeholder="40.7128" value={formData.latitude} onChange={handleChange}/>
            <FormField id="longitude" name="longitude" label="Longitude" type="number" step="any" placeholder="-74.0060" value={formData.longitude} onChange={handleChange}/>
        </div>
        <FormField id="googleMap" name="googleMap" label="Google Maps URL" type="url" placeholder="https://maps.google.com/..." value={formData.googleMap} onChange={handleChange}/>
        <FormField id="servicesOffered" name="servicesOffered" label="Services Offered" type="textarea" rows={4} placeholder={"Service 1\nService 2\nService 3"} value={formData.servicesOffered} onChange={handleChange}/>
        
        <div className="form-group">
            <label htmlFor="socialSelect" className="flex items-center text-sm text-gray-300 mb-2 font-medium">
                <i className="fas fa-share-alt mr-2 text-primary"></i>Social Media Profiles
            </label>
            <div className="grid md:grid-cols-2 gap-4">
                <Select onValueChange={(value) => {
                    setSocialPlatform(value);
                    if (value !== 'custom') setSocialUrl(value);
                }}>
                    <SelectTrigger className="bg-white/5 border-white/10"><SelectValue placeholder="Select Platform" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="https://facebook.com/">Facebook</SelectItem>
                        <SelectItem value="https://twitter.com/">Twitter/X</SelectItem>
                        <SelectItem value="https://linkedin.com/company/">LinkedIn</SelectItem>
                        <SelectItem value="https://instagram.com/">Instagram</SelectItem>
                        <SelectItem value="custom">Custom URL</SelectItem>
                    </SelectContent>
                </Select>
                <Input placeholder="Enter profile URL" value={socialUrl} onChange={(e) => setSocialUrl(e.target.value)} className="bg-white/5 border-white/10" />
            </div>
            <Button className="mt-2" onClick={addSocialProfile}><i className="fas fa-plus mr-2"></i>Add Profile</Button>
            <div className="flex flex-wrap gap-2 mt-3">
                {socialProfiles.map((url: string) => (
                    <div key={url} className="bg-primary/20 border border-primary/30 px-3 py-1 rounded-full text-xs flex items-center gap-2 text-primary-200">
                        {url} <button onClick={() => removeSocialProfile(url)} className="text-red-400 hover:text-red-300">×</button>
                    </div>
                ))}
            </div>
        </div>
    </div>
    )
};

export default function Home() {
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState('basic');
    const [generatedSchema, setGeneratedSchema] = useState('');
    const [schemaHistory, setSchemaHistory] = useLocalStorage<HistoryItem[]>('schemaHistory', []);
    const [socialProfiles, setSocialProfiles] = useLocalStorage<string[]>('socialProfiles', []);
    
    const [formData, setFormData] = useLocalStorage('formData', {
        businessType: 'LocalBusiness',
        name: '',
        url: '',
        description: '',
        telephone: '',
        email: '',
        streetAddress: '',
        addressLocality: '',
        addressRegion: '',
        postalCode: '',
        addressCountry: 'US',
        voiceSummary: '',
        speakableContent: '.business-summary, .contact-info, .hours-info, .voice-answer',
        voiceKeywords: 'near me, best, top rated, local, professional',
        faqQuestions: 'What are your hours?\nWhere are you located?\nDo you offer free estimates?\nHow can I contact you?',
        serviceAreas: '',
        ratingValue: '',
        reviewCount: '',
        latitude: '',
        longitude: '',
        googleMap: '',
        servicesOffered: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | { target: { name: string; value: string } }) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    };

    const generateSchema = useCallback(() => {
        const { name, description, telephone, streetAddress, addressLocality, addressRegion } = formData;
        if (!name || !description || !telephone || !streetAddress || !addressLocality || !addressRegion) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please fill in all required fields in the Basic Info tab.'});
            setActiveTab('basic');
            return;
        }

        const schema: any = {
            "@context": "https://schema.org",
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
           schema.mainEntity = formData.faqQuestions.split('\n').filter(q => q.trim()).map(q => ({
                "@type": "Question",
                "name": q.trim(),
                "acceptedAnswer": { "@type": "Answer", "text": `Contact us at ${formData.telephone} for more information.` }
            }));
           schema['@type'] = "FAQPage";
        }

        const cleanedSchema = cleanObject({
          ...schema,
          email: formData.email,
          geo: (formData.latitude && formData.longitude) ? { "@type": "GeoCoordinates", latitude: parseFloat(formData.latitude), longitude: parseFloat(formData.longitude) } : undefined,
          hasMap: formData.googleMap,
          aggregateRating: (formData.ratingValue && formData.reviewCount) ? { "@type": "AggregateRating", ratingValue: parseFloat(formData.ratingValue), reviewCount: parseInt(formData.reviewCount) } : undefined,
          areaServed: formData.serviceAreas ? formData.serviceAreas.split(',').map(area => ({ "@type": "Place", "name": area.trim() })) : undefined,
          makesOffer: formData.servicesOffered ? formData.servicesOffered.split('\n').map(s => ({ "@type": "Offer", "itemOffered": { "@type": "Service", "name": s.trim() }})) : undefined,
          sameAs: socialProfiles.length > 0 ? socialProfiles : undefined,
          speakable: formData.speakableContent ? { "@type": "SpeakableSpecification", cssSelector: formData.speakableContent.split(',').map(s => s.trim()) } : undefined,
          keywords: formData.voiceKeywords,
        });
        
        let fullScript = `<script type="application/ld+json">\n${JSON.stringify(cleanedSchema, null, 2)}\n</script>`;
        
        const metaTags = `<!-- Voice Search Optimization Meta Tags -->\n<meta name="voice-summary" content="${formData.voiceSummary || formData.description}">\n<meta name="description" content="${formData.description}">`;
        
        const finalOutput = `${metaTags}\n\n${fullScript}`;
        setGeneratedSchema(finalOutput);
        
        const newHistoryItem: HistoryItem = {
            id: Date.now().toString(),
            name: formData.name,
            timestamp: new Date().toLocaleString(),
            schema: finalOutput
        };
        setSchemaHistory(prev => [newHistoryItem, ...prev]);

        toast({ title: 'Schema Generated!', description: 'Your voice-optimized schema is ready.'});
    }, [formData, socialProfiles, toast, setSchemaHistory]);

    const copySchema = () => {
        if (!generatedSchema) {
            toast({ variant: 'destructive', title: 'Nothing to Copy', description: 'Please generate a schema first.' });
            return;
        }
        navigator.clipboard.writeText(generatedSchema);
        toast({ title: 'Copied!', description: 'Schema copied to clipboard.' });
    };

    const resetFields = () => {
        setFormData({
            businessType: 'LocalBusiness', name: '', url: '', description: '', telephone: '', email: '', streetAddress: '', addressLocality: '', addressRegion: '', postalCode: '', addressCountry: 'US', voiceSummary: '', speakableContent: '.business-summary, .contact-info, .hours-info, .voice-answer', voiceKeywords: 'near me, best, top rated, local, professional', faqQuestions: 'What are your hours?\nWhere are you located?\nDo you offer free estimates?\nHow can I contact you?', serviceAreas: '', ratingValue: '', reviewCount: '', latitude: '', longitude: '', googleMap: '', servicesOffered: '',
        });
        setSocialProfiles([]);
        setGeneratedSchema('');
        toast({ title: 'Fields Reset', description: 'All form fields have been cleared.' });
    };

    return (
        <div className="min-h-screen">
            <Header />
            <main className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
                <div className="grid lg:grid-cols-2 gap-8 items-start">
                    <Card className="bg-card/80 border-white/10 shadow-2xl backdrop-blur-xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3 text-2xl"><i className="fas fa-cogs text-primary"></i>Schema Configuration</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-xl p-6 mb-8">
                                <h3 className="flex items-center gap-3 font-semibold text-lg bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-4"><i className="fas fa-magic"></i>Voice Search Features</h3>
                                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 group">
                                    <FeatureCard icon="fas fa-microphone-alt" title="Speakable Schema" description="Optimize content for voice assistants" />
                                    <FeatureCard icon="fas fa-map-marker-alt" title="Local Voice Search" description="Target 'near me' queries" />
                                    <FeatureCard icon="fas fa-question-circle" title="FAQ Optimization" description="Voice-friendly Q&A format" />
                                    <FeatureCard icon="fas fa-mobile-alt" title="Mobile First" description="Optimized for mobile voice search" />
                                </div>
                            </div>
                            <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
                            {activeTab === 'basic' && <BasicInfoTab formData={formData} handleChange={handleChange} />}
                            {activeTab === 'voice' && <VoiceSearchTab formData={formData} handleChange={handleChange} />}
                            {activeTab === 'advanced' && <AdvancedTab formData={formData} handleChange={handleChange} socialProfiles={socialProfiles} setSocialProfiles={setSocialProfiles} />}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                                <Button onClick={generateSchema}><i className="fas fa-magic mr-2"></i>Generate</Button>
                                <Button variant="secondary" onClick={copySchema}><i className="fas fa-copy mr-2"></i>Copy</Button>
                                <Button variant="outline" onClick={() => {
                                  if(!generatedSchema) return toast({variant: 'destructive', title: 'Nothing to validate'});
                                  try {
                                    const scriptMatches = generatedSchema.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/g);
                                    if (scriptMatches && scriptMatches.length > 0) {
                                       scriptMatches.forEach(match => {
                                         const jsonContent = match.replace(/<\/?script[^>]*>/g, '').trim();
                                         JSON.parse(jsonContent);
                                       });
                                       toast({title: 'Validation', description: 'JSON is well-formed!'});
                                    } else {
                                       toast({variant: 'destructive', title: 'Validation Error', description: 'No JSON-LD script found.'});
                                    }
                                  } catch (e: any) {
                                    toast({variant: 'destructive', title: 'Validation Error', description: `Invalid JSON: ${e.message}`});
                                  }
                                }}><i className="fas fa-check-circle mr-2"></i>Validate</Button>
                                <Button variant="destructive" onClick={resetFields}><i className="fas fa-sync-alt mr-2"></i>Reset</Button>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="lg:sticky lg:top-24">
                        <Card className="bg-card/80 border-white/10 shadow-2xl backdrop-blur-xl">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-3 text-2xl"><i className="fas fa-code text-primary"></i>Schema Preview</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="bg-black/40 border border-white/10 rounded-xl p-4 font-mono text-xs max-h-96 overflow-auto relative text-gray-300">
                                    <pre>{generatedSchema || '// Your generated schema will appear here...'}</pre>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-card/80 border-white/10 shadow-2xl backdrop-blur-xl mt-8">
                             <CardHeader>
                                <CardTitle className="flex items-center gap-3 text-2xl"><i className="fas fa-history text-primary"></i>Schema History</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="max-h-60 overflow-auto space-y-3 pr-2">
                                {schemaHistory.length > 0 ? schemaHistory.map(item => (
                                    <div key={item.id} onClick={() => setGeneratedSchema(item.schema)} className="bg-white/5 border border-white/10 p-3 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                                        <p className="font-semibold text-gray-200">{item.name}</p>
                                        <p className="text-xs text-gray-400">{item.timestamp}</p>
                                    </div>
                                )) : <p className="text-gray-500 text-center py-4">No history yet.</p>}
                                </div>
                                {schemaHistory.length > 0 && <Button variant="destructive" className="w-full mt-4" onClick={() => setSchemaHistory([])}><i className="fas fa-trash-alt mr-2" />Clear History</Button>}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
}

    