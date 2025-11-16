import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  FileText,
  Briefcase,
  MapPin,
  AlertTriangle,
  FolderCheck,
  Loader2,
} from "lucide-react";

interface SearchResult {
  forms: Array<{ type: string; label: string; url: string }>;
  jobs: Array<{ id: number; name: string; code: string; url: string }>;
  sites: Array<{ id: number; name: string; url: string }>;
  incidents: Array<{ id: number; title: string; code: string; url: string }>;
  submissions: Array<{ id: number; formType: string; url: string }>;
}

const FORM_TYPE_LABELS: Record<string, string> = {
  'take-5': 'Take 5',
  'crew-briefing': 'Crew Briefing',
  'risk-control-plan': 'Risk Control Plan',
  'permit-to-work': 'Permit to Work',
  'incident-report': 'Incident Report',
  'variation': 'Variation',
};

interface SearchCommandProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export default function SearchCommand({ open: controlledOpen, onOpenChange }: SearchCommandProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [, setLocation] = useLocation();

  // Use controlled state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  // Debounce search query (300ms delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch search results with debounced query
  const { data, isLoading } = useQuery<SearchResult>({
    queryKey: ["/api/search", debouncedQuery],
    enabled: debouncedQuery.length >= 2,
  });

  // Keyboard shortcut listener (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handle result selection
  const handleSelect = useCallback(
    (url: string) => {
      setOpen(false);
      setSearchQuery("");
      setLocation(url);
    },
    [setLocation]
  );

  // Reset search query when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
    }
  }, [open]);

  const hasResults =
    data &&
    (data.forms.length > 0 ||
      data.jobs.length > 0 ||
      data.sites.length > 0 ||
      data.incidents.length > 0 ||
      data.submissions.length > 0);

  const showEmpty = debouncedQuery.length >= 2 && !isLoading && !hasResults;

  return (
    <CommandDialog open={open} onOpenChange={setOpen} data-testid="dialog-search">
      <CommandInput
        placeholder="Type to search..."
        value={searchQuery}
        onValueChange={setSearchQuery}
        data-testid="input-search"
      />
      <CommandList>
        {isLoading && debouncedQuery.length >= 2 && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!isLoading && debouncedQuery.length < 2 && (
          <CommandEmpty>Type at least 2 characters to search...</CommandEmpty>
        )}

        {showEmpty && <CommandEmpty>No results found</CommandEmpty>}

        {!isLoading && data && (
          <>
            {data.forms.length > 0 && (
              <CommandGroup heading="Forms">
                {data.forms.map((form, index) => (
                  <CommandItem
                    key={form.type}
                    onSelect={() => handleSelect(form.url)}
                    data-testid={`result-form-${index}`}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    <span>{form.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {data.jobs.length > 0 && (
              <CommandGroup heading="Jobs">
                {data.jobs.map((job, index) => (
                  <CommandItem
                    key={job.id}
                    onSelect={() => handleSelect(job.url)}
                    data-testid={`result-job-${index}`}
                  >
                    <Briefcase className="mr-2 h-4 w-4" />
                    <span>
                      {job.name} ({job.code})
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {data.sites.length > 0 && (
              <CommandGroup heading="Sites">
                {data.sites.map((site, index) => (
                  <CommandItem
                    key={site.id}
                    onSelect={() => handleSelect(site.url)}
                    data-testid={`result-site-${index}`}
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    <span>{site.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {data.incidents.length > 0 && (
              <CommandGroup heading="Incidents">
                {data.incidents.map((incident, index) => (
                  <CommandItem
                    key={incident.id}
                    onSelect={() => handleSelect(incident.url)}
                    data-testid={`result-incident-${index}`}
                  >
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    <span>
                      {incident.title} ({incident.code})
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {data.submissions.length > 0 && (
              <CommandGroup heading="Submissions">
                {data.submissions.map((submission, index) => (
                  <CommandItem
                    key={submission.id}
                    onSelect={() => handleSelect(submission.url)}
                    data-testid={`result-submission-${index}`}
                  >
                    <FolderCheck className="mr-2 h-4 w-4" />
                    <span>{FORM_TYPE_LABELS[submission.formType] || submission.formType}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
