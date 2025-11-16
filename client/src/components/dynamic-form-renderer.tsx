import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export interface Question {
  id: string;
  label: string;
  fieldType: 'text' | 'textarea' | 'radio' | 'checkbox' | 'date' | 'time' | 'number';
  required: boolean;
  options?: string[];
  placeholder?: string;
  helpText?: string;
}

export interface FormTemplate {
  id?: number;
  name: string;
  description: string;
  type: string;
  schema: {
    questions: Question[];
  };
}

interface DynamicFormRendererProps {
  template: FormTemplate;
  onSubmit: (data: Record<string, any>) => void;
  isSubmitting?: boolean;
  submitButtonText?: string;
}

export function DynamicFormRenderer({ 
  template, 
  onSubmit, 
  isSubmitting = false,
  submitButtonText = "Submit"
}: DynamicFormRendererProps) {
  // Build Zod schema dynamically based on questions
  const buildValidationSchema = () => {
    const schemaShape: Record<string, z.ZodTypeAny> = {};
    
    template.schema.questions.forEach((question) => {
      let fieldSchema: z.ZodTypeAny;
      
      switch (question.fieldType) {
        case 'number':
          fieldSchema = question.required 
            ? z.coerce.number({ required_error: `${question.label} is required` })
            : z.coerce.number().optional();
          break;
        case 'date':
          fieldSchema = question.required
            ? z.string({ required_error: `${question.label} is required` }).min(1, `${question.label} is required`)
            : z.string().optional();
          break;
        case 'time':
          fieldSchema = question.required
            ? z.string({ required_error: `${question.label} is required` }).min(1, `${question.label} is required`)
            : z.string().optional();
          break;
        case 'checkbox':
          fieldSchema = question.required
            ? z.array(z.string()).min(1, `Please select at least one option`)
            : z.array(z.string()).optional();
          break;
        default:
          fieldSchema = question.required
            ? z.string({ required_error: `${question.label} is required` }).min(1, `${question.label} is required`)
            : z.string().optional();
      }
      
      schemaShape[question.id] = fieldSchema;
    });
    
    return z.object(schemaShape);
  };

  const formSchema = buildValidationSchema();
  
  // Build default values
  const defaultValues = template.schema.questions.reduce((acc, question) => {
    if (question.fieldType === 'checkbox') {
      acc[question.id] = [];
    } else {
      acc[question.id] = "";
    }
    return acc;
  }, {} as Record<string, any>);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {template.schema.questions.map((question) => (
          <FormField
            key={question.id}
            control={form.control}
            name={question.id}
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {question.label}
                  {question.required && <span className="text-destructive ml-1">*</span>}
                </FormLabel>
                {question.helpText && (
                  <FormDescription>{question.helpText}</FormDescription>
                )}
                <FormControl>
                  {(() => {
                    switch (question.fieldType) {
                      case 'textarea':
                        return (
                          <Textarea
                            placeholder={question.placeholder}
                            {...field}
                            data-testid={`field-${question.id}`}
                          />
                        );
                      
                      case 'radio':
                        return (
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            data-testid={`field-${question.id}`}
                          >
                            <div className="space-y-2">
                              {(question.options || []).map((option, index) => (
                                <div key={index} className="flex items-center space-x-2">
                                  <RadioGroupItem 
                                    value={option} 
                                    id={`${question.id}-${index}`}
                                    data-testid={`radio-${question.id}-${index}`}
                                  />
                                  <Label htmlFor={`${question.id}-${index}`}>{option}</Label>
                                </div>
                              ))}
                            </div>
                          </RadioGroup>
                        );
                      
                      case 'checkbox':
                        return (
                          <div className="space-y-2" data-testid={`field-${question.id}`}>
                            {(question.options || []).map((option, index) => (
                              <div key={index} className="flex items-center space-x-2">
                                <Checkbox
                                  checked={(field.value as string[] || []).includes(option)}
                                  onCheckedChange={(checked) => {
                                    const currentValue = field.value as string[] || [];
                                    if (checked) {
                                      field.onChange([...currentValue, option]);
                                    } else {
                                      field.onChange(currentValue.filter((v) => v !== option));
                                    }
                                  }}
                                  id={`${question.id}-${index}`}
                                  data-testid={`checkbox-${question.id}-${index}`}
                                />
                                <Label htmlFor={`${question.id}-${index}`}>{option}</Label>
                              </div>
                            ))}
                          </div>
                        );
                      
                      case 'date':
                        return (
                          <Input
                            type="date"
                            {...field}
                            data-testid={`field-${question.id}`}
                          />
                        );
                      
                      case 'time':
                        return (
                          <Input
                            type="time"
                            {...field}
                            data-testid={`field-${question.id}`}
                          />
                        );
                      
                      case 'number':
                        return (
                          <Input
                            type="number"
                            placeholder={question.placeholder}
                            {...field}
                            data-testid={`field-${question.id}`}
                          />
                        );
                      
                      default:
                        return (
                          <Input
                            type="text"
                            placeholder={question.placeholder}
                            {...field}
                            data-testid={`field-${question.id}`}
                          />
                        );
                    }
                  })()}
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}

        <div className="flex justify-end gap-4">
          <Button 
            type="submit" 
            disabled={isSubmitting}
            data-testid="button-submit-form"
          >
            {isSubmitting ? "Submitting..." : submitButtonText}
          </Button>
        </div>
      </form>
    </Form>
  );
}
