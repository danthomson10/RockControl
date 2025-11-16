import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, GripVertical, Save, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

type FieldType = 'text' | 'textarea' | 'radio' | 'checkbox' | 'date' | 'time' | 'number';

interface Question {
  id: string;
  label: string;
  fieldType: FieldType;
  required: boolean;
  options?: string[];
  placeholder?: string;
  helpText?: string;
}

interface FormTemplate {
  id?: number;
  name: string;
  description: string;
  type: string;
  schema: {
    questions: Question[];
  };
}

export default function FormBuilder() {
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateType, setTemplateType] = useState("incident-report");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);

  const { data: templates } = useQuery<FormTemplate[]>({
    queryKey: ['/api/form-templates'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => apiRequest('/api/form-templates', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/form-templates'] });
      toast({
        title: "Success",
        description: "Form template created successfully",
      });
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create template",
        variant: "destructive",
      });
    },
  });

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `q-${Date.now()}`,
      label: "",
      fieldType: "text",
      required: false,
      placeholder: "",
      helpText: "",
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, ...updates } : q
    ));
  };

  const deleteQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= questions.length) return;
    
    const newQuestions = [...questions];
    [newQuestions[index], newQuestions[newIndex]] = [newQuestions[newIndex], newQuestions[index]];
    setQuestions(newQuestions);
  };

  const addOption = (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    if (!question) return;
    
    const options = question.options || [];
    updateQuestion(questionId, { options: [...options, ""] });
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    const question = questions.find(q => q.id === questionId);
    if (!question || !question.options) return;
    
    const newOptions = [...question.options];
    newOptions[optionIndex] = value;
    updateQuestion(questionId, { options: newOptions });
  };

  const deleteOption = (questionId: string, optionIndex: number) => {
    const question = questions.find(q => q.id === questionId);
    if (!question || !question.options) return;
    
    const newOptions = question.options.filter((_, i) => i !== optionIndex);
    updateQuestion(questionId, { options: newOptions });
  };

  const handleSave = () => {
    if (!templateName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a template name",
        variant: "destructive",
      });
      return;
    }

    if (questions.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one question",
        variant: "destructive",
      });
      return;
    }

    // Validate questions
    const invalidQuestions = questions.filter(q => !q.label.trim());
    if (invalidQuestions.length > 0) {
      toast({
        title: "Error",
        description: "All questions must have a label",
        variant: "destructive",
      });
      return;
    }

    createMutation.mutate({
      name: templateName,
      description: templateDescription,
      type: templateType,
      schema: { questions },
    });
  };

  const resetForm = () => {
    setTemplateName("");
    setTemplateDescription("");
    setTemplateType("incident-report");
    setQuestions([]);
  };

  const loadTemplate = (template: FormTemplate) => {
    setTemplateName(template.name);
    setTemplateDescription(template.description);
    setTemplateType(template.type);
    setQuestions(template.schema.questions);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="heading-form-builder">Form Builder</h1>
          <p className="text-muted-foreground mt-1">Create and manage custom form templates</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-preview">
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{templateName || "Form Preview"}</DialogTitle>
                <DialogDescription>{templateDescription}</DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-4 p-4">
                  {questions.map((q) => (
                    <div key={q.id} className="space-y-2">
                      <Label>
                        {q.label}
                        {q.required && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      {q.helpText && <p className="text-sm text-muted-foreground">{q.helpText}</p>}
                      {q.fieldType === 'textarea' ? (
                        <Textarea placeholder={q.placeholder} />
                      ) : q.fieldType === 'radio' && q.options ? (
                        <div className="space-y-2">
                          {q.options.map((opt, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <input type="radio" name={q.id} />
                              <span>{opt}</span>
                            </div>
                          ))}
                        </div>
                      ) : q.fieldType === 'checkbox' && q.options ? (
                        <div className="space-y-2">
                          {q.options.map((opt, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <input type="checkbox" />
                              <span>{opt}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <Input type={q.fieldType} placeholder={q.placeholder} />
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
          <Button onClick={handleSave} disabled={createMutation.isPending} data-testid="button-save-template">
            <Save className="w-4 h-4 mr-2" />
            {createMutation.isPending ? "Saving..." : "Save Template"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Template Details</CardTitle>
              <CardDescription>Set up the basic information for your form template</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name *</Label>
                <Input
                  id="name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Incident Report"
                  data-testid="input-template-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Describe what this form is used for..."
                  rows={3}
                  data-testid="input-template-description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Form Type</Label>
                <Select value={templateType} onValueChange={setTemplateType}>
                  <SelectTrigger data-testid="select-template-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="incident-report">Incident Report</SelectItem>
                    <SelectItem value="take-5">Take-5</SelectItem>
                    <SelectItem value="variation">Variation</SelectItem>
                    <SelectItem value="crew-briefing">Crew Briefing</SelectItem>
                    <SelectItem value="risk-control-plan">Risk Control Plan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Questions</CardTitle>
                  <CardDescription>Add and configure form questions</CardDescription>
                </div>
                <Button onClick={addQuestion} size="sm" data-testid="button-add-question">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Question
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {questions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No questions yet. Click "Add Question" to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {questions.map((question, index) => (
                    <Card key={question.id} className="border-muted" data-testid={`card-question-${index}`}>
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex items-start gap-2">
                          <div className="flex flex-col gap-1 mt-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={() => moveQuestion(index, 'up')}
                              disabled={index === 0}
                              data-testid={`button-move-up-${index}`}
                            >
                              <GripVertical className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="flex-1 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="md:col-span-2 space-y-2">
                                <Label>Question Label *</Label>
                                <Input
                                  value={question.label}
                                  onChange={(e) => updateQuestion(question.id, { label: e.target.value })}
                                  placeholder="Enter your question..."
                                  data-testid={`input-question-label-${index}`}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Field Type</Label>
                                <Select 
                                  value={question.fieldType} 
                                  onValueChange={(value) => updateQuestion(question.id, { fieldType: value as FieldType })}
                                >
                                  <SelectTrigger data-testid={`select-field-type-${index}`}>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="text">Short Text</SelectItem>
                                    <SelectItem value="textarea">Paragraph</SelectItem>
                                    <SelectItem value="radio">Radio Buttons</SelectItem>
                                    <SelectItem value="checkbox">Checkboxes</SelectItem>
                                    <SelectItem value="date">Date</SelectItem>
                                    <SelectItem value="time">Time</SelectItem>
                                    <SelectItem value="number">Number</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Placeholder (Optional)</Label>
                                <Input
                                  value={question.placeholder || ""}
                                  onChange={(e) => updateQuestion(question.id, { placeholder: e.target.value })}
                                  placeholder="e.g., Enter description..."
                                  data-testid={`input-placeholder-${index}`}
                                />
                              </div>
                              <div className="md:col-span-2 space-y-2">
                                <Label>Help Text (Optional)</Label>
                                <Input
                                  value={question.helpText || ""}
                                  onChange={(e) => updateQuestion(question.id, { helpText: e.target.value })}
                                  placeholder="Additional guidance for this question..."
                                  data-testid={`input-help-text-${index}`}
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={question.required}
                                  onCheckedChange={(checked) => updateQuestion(question.id, { required: checked })}
                                  data-testid={`switch-required-${index}`}
                                />
                                <Label>Required</Label>
                              </div>
                            </div>

                            {(question.fieldType === 'radio' || question.fieldType === 'checkbox') && (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label>Options</Label>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => addOption(question.id)}
                                    data-testid={`button-add-option-${index}`}
                                  >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Add Option
                                  </Button>
                                </div>
                                <div className="space-y-2">
                                  {(question.options || []).map((option, optIndex) => (
                                    <div key={optIndex} className="flex gap-2">
                                      <Input
                                        value={option}
                                        onChange={(e) => updateOption(question.id, optIndex, e.target.value)}
                                        placeholder={`Option ${optIndex + 1}`}
                                        data-testid={`input-option-${index}-${optIndex}`}
                                      />
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => deleteOption(question.id, optIndex)}
                                        data-testid={`button-delete-option-${index}-${optIndex}`}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteQuestion(question.id)}
                            className="text-destructive"
                            data-testid={`button-delete-question-${index}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Existing Templates</CardTitle>
              <CardDescription>Load a template to edit or create a new one</CardDescription>
            </CardHeader>
            <CardContent>
              {!templates || templates.length === 0 ? (
                <p className="text-sm text-muted-foreground">No templates yet</p>
              ) : (
                <div className="space-y-2">
                  {templates.map((template) => (
                    <Button
                      key={template.id}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => loadTemplate(template)}
                      data-testid={`button-load-template-${template.id}`}
                    >
                      <div className="text-left">
                        <div className="font-medium">{template.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {template.schema.questions.length} questions
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
