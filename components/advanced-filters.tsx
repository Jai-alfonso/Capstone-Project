"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Filter, X, RotateCcw } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface FilterState {
  dateRange: {
    from: string;
    to: string;
  };
  status: string[];
  caseType: string[];
  attorney: string;
  priority: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

interface AdvancedFiltersProps {
  onFiltersChange: (filters: FilterState) => void;
  activeFilters: FilterState;
}

const statusOptions = [
  "Case Filed",
  "Under Review",
  "Court Hearing",
  "Motion Hearings",
  "Closed",
];

const caseTypeOptions = [
  "Civil Case",
  "Criminal Case",
  "Administrative Case",
  "Tax & Accounting",
  "Corporate Services",
  "Family Law",
];

const attorneyOptions = ["Atty. Alia Jan D. Delgado", "All Attorneys"];

const priorityOptions = ["High", "Medium", "Low"];

const sortOptions = [
  { value: "date", label: "Date Created" },
  { value: "status", label: "Status" },
  { value: "priority", label: "Priority" },
  { value: "title", label: "Title" },
];

export function AdvancedFilters({
  onFiltersChange,
  activeFilters,
}: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<FilterState>(activeFilters);

  const updateFilter = (key: keyof FilterState, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
  };

  const toggleArrayFilter = (key: "status" | "caseType", value: string) => {
    const currentArray = localFilters[key];
    const newArray = currentArray.includes(value)
      ? currentArray.filter((item) => item !== value)
      : [...currentArray, value];
    updateFilter(key, newArray);
  };

  const applyFilters = () => {
    onFiltersChange(localFilters);
    setIsOpen(false);
  };

  const resetFilters = () => {
    const resetState: FilterState = {
      dateRange: { from: "", to: "" },
      status: [],
      caseType: [],
      attorney: "",
      priority: "",
      sortBy: "date",
      sortOrder: "desc",
    };
    setLocalFilters(resetState);
    onFiltersChange(resetState);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (localFilters.dateRange.from || localFilters.dateRange.to) count++;
    if (localFilters.status.length > 0) count++;
    if (localFilters.caseType.length > 0) count++;
    if (localFilters.attorney) count++;
    if (localFilters.priority) count++;
    return count;
  };

  const getActiveFilterLabels = () => {
    const labels: string[] = [];
    if (localFilters.dateRange.from || localFilters.dateRange.to) {
      labels.push(
        `Date: ${localFilters.dateRange.from || "Any"} - ${
          localFilters.dateRange.to || "Any"
        }`
      );
    }
    if (localFilters.status.length > 0) {
      labels.push(`Status: ${localFilters.status.join(", ")}`);
    }
    if (localFilters.caseType.length > 0) {
      labels.push(`Type: ${localFilters.caseType.join(", ")}`);
    }
    if (localFilters.attorney) {
      labels.push(`Attorney: ${localFilters.attorney}`);
    }
    if (localFilters.priority) {
      labels.push(`Priority: ${localFilters.priority}`);
    }
    return labels;
  };

  return (
    <div className="flex items-center gap-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="relative bg-transparent">
            <Filter className="h-4 w-4 mr-2" />
            Advanced Filters
            {getActiveFilterCount() > 0 && (
              <Badge className="ml-2 bg-red-accent text-white text-xs min-w-[1.25rem] h-5">
                {getActiveFilterCount()}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-0" align="end">
          <Card className="border-0 shadow-none">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Advanced Filters</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="text-red-600 hover:text-red-700"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Reset
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Date Range */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Date Range</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-gray-600">From</Label>
                    <Input
                      type="date"
                      value={localFilters.dateRange.from}
                      onChange={(e) =>
                        updateFilter("dateRange", {
                          ...localFilters.dateRange,
                          from: e.target.value,
                        })
                      }
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-600">To</Label>
                    <Input
                      type="date"
                      value={localFilters.dateRange.to}
                      onChange={(e) =>
                        updateFilter("dateRange", {
                          ...localFilters.dateRange,
                          to: e.target.value,
                        })
                      }
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Status</Label>
                <div className="flex flex-wrap gap-1">
                  {statusOptions.map((status) => (
                    <Badge
                      key={status}
                      variant={
                        localFilters.status.includes(status)
                          ? "default"
                          : "outline"
                      }
                      className="cursor-pointer text-xs hover:bg-navy-100 transition-colors"
                      onClick={() => toggleArrayFilter("status", status)}
                    >
                      {status}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Case Type Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Case Type</Label>
                <div className="flex flex-wrap gap-1">
                  {caseTypeOptions.map((type) => (
                    <Badge
                      key={type}
                      variant={
                        localFilters.caseType.includes(type)
                          ? "default"
                          : "outline"
                      }
                      className="cursor-pointer text-xs hover:bg-navy-100 transition-colors"
                      onClick={() => toggleArrayFilter("caseType", type)}
                    >
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Attorney Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Attorney</Label>
                <Select
                  value={localFilters.attorney}
                  onValueChange={(value) => updateFilter("attorney", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select attorney" />
                  </SelectTrigger>
                  <SelectContent>
                    {attorneyOptions.map((attorney) => (
                      <SelectItem key={attorney} value={attorney}>
                        {attorney}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Priority</Label>
                <Select
                  value={localFilters.priority}
                  onValueChange={(value) => updateFilter("priority", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((priority) => (
                      <SelectItem key={priority} value={priority}>
                        {priority}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Sort Options */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Sort By</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={localFilters.sortBy}
                    onValueChange={(value) => updateFilter("sortBy", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={localFilters.sortOrder}
                    onValueChange={(value) => updateFilter("sortOrder", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="asc">Ascending</SelectItem>
                      <SelectItem value="desc">Descending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Apply Button */}
              <Button
                onClick={applyFilters}
                className="w-full bg-navy-700 hover:bg-navy-800"
              >
                Apply Filters
              </Button>
            </CardContent>
          </Card>
        </PopoverContent>
      </Popover>

      {/* Active Filter Tags */}
      {getActiveFilterLabels().length > 0 && (
        <div className="flex flex-wrap gap-1">
          {getActiveFilterLabels().map((label, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="text-xs cursor-pointer hover:bg-red-100 hover:text-red-800 transition-colors"
              onClick={() => {
                resetFilters();
              }}
            >
              {label}
              <X className="h-3 w-3 ml-1" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
