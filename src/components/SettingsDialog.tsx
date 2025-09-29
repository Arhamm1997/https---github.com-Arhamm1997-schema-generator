'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useSettingsAuth } from '@/hooks/use-settings-auth';
import { useAISettings } from '@/hooks/use-ai-settings';
import { AIProvider, AIProviderConfig } from '@/ai/providers';
import { 
  Settings, 
  Lock, 
  Eye, 
  EyeOff, 
  Key, 
  Bot, 
  CheckCircle, 
  XCircle, 
  LogOut,
  Trash2,
  Save,
  RefreshCw,
  Shield,
  Zap,
  Brain,
  Sparkles
} from 'lucide-react';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const ProviderIcon = ({ provider }: { provider: AIProvider }) => {
  switch (provider) {
    case 'gemini':
      return <Sparkles className="h-5 w-5 text-blue-500" />;
    case 'openai':
      return <Zap className="h-5 w-5 text-green-500" />;
    case 'claude':
      return <Brain className="h-5 w-5 text-purple-500" />;
    default:
      return <Bot className="h-5 w-5" />;
  }
};


const AuthenticationForm = ({ onAuthenticated }: { onAuthenticated: () => void }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { authenticate } = useSettingsAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = await authenticate(password);
      if (success) {
        toast({ 
          title: 'Authentication Successful', 
          description: 'You now have access to AI settings.',
          duration: 3000
        });
        // Instead of just force refresh, call onAuthenticated to update parent state
        onAuthenticated();
      } else {
        toast({ 
          variant: 'destructive',
          title: 'Authentication Failed', 
          description: 'Invalid password. Please try again.',
          duration: 3000
        });
      }
    } catch (error) {
      toast({ 
        variant: 'destructive',
        title: 'Error', 
        description: 'An error occurred during authentication.',
        duration: 3000
      });
    } finally {
      setIsLoading(false);
      setPassword('');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto"
    >
      <Card className="border-border shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <Shield className="h-6 w-6 text-primary" />
            Settings Access
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Enter the password to access AI provider settings
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter settings password"
                  className="pr-10"
                  disabled={isLoading}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-8 w-8 px-0"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !password}
            >
              {isLoading ? (
                <motion.div className="flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Authenticating...
                </motion.div>
              ) : (
                <div className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Unlock Settings
                </div>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const AIProviderSettings = ({ onClose }: { onClose: () => void }) => {
  const { logout } = useSettingsAuth();
  const { 
    configs, 
    activeProvider, 
    isLoading, 
    updateApiKey, 
    setProvider, 
    getProviderConfig,
    isProviderConfigured,
    clearApiKey,
    reload
  } = useAISettings();
  const { toast } = useToast();
  
  const [apiKeys, setApiKeys] = useState<{ [key in AIProvider]: string }>({
    gemini: '',
    openai: '',
    claude: ''
  });
  const [showApiKeys, setShowApiKeys] = useState<{ [key in AIProvider]: boolean }>({
    gemini: false,
    openai: false,
    claude: false
  });
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>(activeProvider);
  const [isSaving, setIsSaving] = useState<AIProvider | null>(null);

  useEffect(() => {
    // Load existing API keys (masked)
    configs.forEach((config, provider) => {
      const apiKey = typeof config.apiKey === 'string' ? config.apiKey : '';
      if (apiKey) {
        setApiKeys(prev => ({
          ...prev,
          [provider]: '•'.repeat(20) + apiKey.slice(-4)
        }));
      }
    });
  }, [configs]);

  const handleApiKeyChange = (provider: AIProvider, value: string) => {
    setApiKeys(prev => ({
      ...prev,
      [provider]: value
    }));
  };

  const handleSaveApiKey = async (provider: AIProvider) => {
    const apiKey = apiKeys[provider];
    if (!apiKey || apiKey.includes('•')) return;

    setIsSaving(provider);
    try {
      await updateApiKey(provider, apiKey);
      toast({
        title: 'API Key Saved',
        description: `${configs.get(provider)?.displayName} API key has been saved successfully.`,
        duration: 3000
      });
      
      // Mask the saved key
      setApiKeys(prev => ({
        ...prev,
        [provider]: '•'.repeat(20) + apiKey.slice(-4)
      }));
      
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save API key. Please try again.',
        duration: 3000
      });
    } finally {
      setIsSaving(null);
    }
  };

  const handleClearApiKey = async (provider: AIProvider) => {
    try {
      await clearApiKey(provider);
      setApiKeys(prev => ({
        ...prev,
        [provider]: ''
      }));
      toast({
        title: 'API Key Cleared',
        description: `${configs.get(provider)?.displayName} API key has been cleared.`,
        duration: 3000
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to clear API key. Please try again.',
        duration: 3000
      });
    }
  };

  const handleSetActiveProvider = (provider: AIProvider) => {
    try {
      setProvider(provider);
      setSelectedProvider(provider);
      toast({
        title: 'Provider Changed',
        description: `Active AI provider set to ${configs.get(provider)?.displayName}.`,
        duration: 3000
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to change provider. Please try again.',
        duration: 3000
      });
    }
  };

  const handleLogout = () => {
    logout();
    onClose();
    toast({
      title: 'Logged Out',
      description: 'You have been logged out of settings.',
      duration: 3000
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">AI Provider Settings</h2>
        </div>
        <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>

      {/* Active Provider Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Active AI Provider
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Select 
              value={selectedProvider} 
              onValueChange={(value: AIProvider) => handleSetActiveProvider(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select AI Provider" />
              </SelectTrigger>
              <SelectContent>
                {Array.from(configs.entries()).map(([provider, config]) => (
                  <SelectItem 
                    key={provider} 
                    value={provider}
                    disabled={!isProviderConfigured(provider)}
                  >
                    <div className="flex items-center gap-2">
                      <ProviderIcon provider={provider} />
                      <span>{config.displayName}</span>
                      {isProviderConfigured(provider) ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedProvider && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Current active provider: <span className="font-medium text-foreground">
                    {configs.get(selectedProvider)?.displayName}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Default model: {configs.get(selectedProvider)?.defaultModel}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* API Keys Configuration */}
      <div className="space-y-4">
        {Array.from(configs.entries()).map(([provider, config]) => (
          <motion.div
            key={provider}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className={isProviderConfigured(provider) ? 'border-green-200 dark:border-green-800' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ProviderIcon provider={provider} />
                    <span>{config.displayName}</span>
                    {isProviderConfigured(provider) ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  {activeProvider === provider && (
                    <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                      Active
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`${provider}-api-key`}>
                    API Key
                    {!isProviderConfigured(provider) && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id={`${provider}-api-key`}
                        type={showApiKeys[provider] ? 'text' : 'password'}
                        value={apiKeys[provider] || ''}
                        onChange={(e) => handleApiKeyChange(provider, e.target.value)}
                        placeholder={`Enter ${config.displayName} API key`}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1 h-8 w-8 px-0"
                        onClick={() => setShowApiKeys(prev => ({
                          ...prev,
                          [provider]: !prev[provider]
                        }))}
                      >
                        {showApiKeys[provider] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <Button 
                      onClick={() => handleSaveApiKey(provider)}
                      disabled={!apiKeys[provider] || apiKeys[provider].includes('•') || isSaving === provider}
                      size="sm"
                    >
                      {isSaving === provider ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                    </Button>
                    {isProviderConfigured(provider) && (
                      <Button 
                        variant="destructive"
                        onClick={() => handleClearApiKey(provider)}
                        size="sm"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p><strong>Available Models:</strong> {config.models.join(', ')}</p>
                  <p><strong>Default Model:</strong> {config.defaultModel}</p>
                  <p><strong>Status:</strong> {isProviderConfigured(provider) ? 
                    <span className="text-green-600">Configured</span> : 
                    <span className="text-red-600">Not configured</span>
                  }</p>
                </div>

                {provider === 'gemini' && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      <Key className="h-3 w-3 inline mr-1" />
                      Get your Gemini API key from <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline">Google AI Studio</a>
                    </p>
                  </div>
                )}

                {provider === 'openai' && (
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-xs text-green-700 dark:text-green-300">
                      <Key className="h-3 w-3 inline mr-1" />
                      Get your OpenAI API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">OpenAI Platform</a>
                    </p>
                  </div>
                )}

                {provider === 'claude' && (
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <p className="text-xs text-purple-700 dark:text-purple-300">
                      <Key className="h-3 w-3 inline mr-1" />
                      Get your Claude API key from <a href="https://console.anthropic.com/keys" target="_blank" rel="noopener noreferrer" className="underline">Anthropic Console</a>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};


export default function SettingsDialog({ isOpen, onClose }: SettingsDialogProps) {
  const { isAuthenticated, isLoading } = useSettingsAuth();
  const [unlocked, setUnlocked] = useState(false);

  // When authentication state changes, update unlocked state
  useEffect(() => {
    if (isAuthenticated) setUnlocked(true);
    else setUnlocked(false);
  }, [isAuthenticated]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            AI Provider Settings
          </DialogTitle>
        </DialogHeader>
        <div className="mt-6">
          <AnimatePresence mode="wait" key={`auth-${unlocked}`}> 
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !unlocked ? (
              <AuthenticationForm onAuthenticated={() => setUnlocked(true)} />
            ) : (
              <AIProviderSettings onClose={onClose} />
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}