"use client"

import { useState, useEffect, useRef } from "react"
import { Search, X, FileText, Calendar, Users, Clock, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu"

interface SearchResult {
  id: string
  title: string
  type: "case" | "document" | "client" | "appointment"
  description: string
  date?: string
  status?: string
  highlight?: string
}

const mockSearchResults: SearchResult[] = [
  {
    id: "1",
    title: "Personal Injury Case - John Doe",
    type: "case",
    description: "Motor vehicle accident compensation claim",
    date: "2024-01-15",
    status: "Court Hearing",
    highlight: "Personal Injury",
  },
  {
    id: "2",
    title: "Medical Records.pdf",
    type: "document",
    description: "Medical documentation for case CASE-001",
    date: "2024-01-20",
    highlight: "Medical Records",
  },
  {
    id: "3",
    title: "Jane Smith",
    type: "client",
    description: "Contract dispute case client",
    date: "2024-02-01",
    status: "Active",
    highlight: "Jane Smith",
  },
  {
    id: "4",
    title: "Consultation Meeting",
    type: "appointment",
    description: "Initial consultation with new client",
    date: "2024-02-10",
    status: "Confirmed",
    highlight: "Consultation",
  },
]

const searchHistory = ["Personal Injury", "Contract Dispute", "Medical Records", "Jane Smith"]

export function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFilters, setSelectedFilters] = useState<string[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>(searchHistory)
  const searchRef = useRef<HTMLDivElement>(null)

  const filterOptions = [
    { value: "case", label: "Cases", icon: FileText },
    { value: "document", label: "Documents", icon: FileText },
    { value: "client", label: "Clients", icon: Users },
    { value: "appointment", label: "Appointments", icon: Calendar },
  ]

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (query.length > 0) {
      setIsLoading(true)
      const timer = setTimeout(() => {
        const filteredResults = mockSearchResults.filter((result) => {
          const matchesQuery =
            result.title.toLowerCase().includes(query.toLowerCase()) ||
            result.description.toLowerCase().includes(query.toLowerCase())
          const matchesFilter = selectedFilters.length === 0 || selectedFilters.includes(result.type)
          return matchesQuery && matchesFilter
        })
        setResults(filteredResults)
        setIsLoading(false)
      }, 300)

      return () => clearTimeout(timer)
    } else {
      setResults([])
      setIsLoading(false)
    }
  }, [query, selectedFilters])

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery)
    setIsOpen(true)

    // Add to recent searches if not already present
    if (searchQuery && !recentSearches.includes(searchQuery)) {
      setRecentSearches((prev) => [searchQuery, ...prev.slice(0, 4)])
    }
  }

  const highlightText = (text: string, highlight: string) => {
    if (!highlight) return text
    const parts = text.split(new RegExp(`(${highlight})`, "gi"))
    return parts.map((part, index) =>
      part.toLowerCase() === highlight.toLowerCase() ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
          {part}
        </mark>
      ) : (
        part
      ),
    )
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "case":
        return <FileText className="h-4 w-4" />
      case "document":
        return <FileText className="h-4 w-4" />
      case "client":
        return <Users className="h-4 w-4" />
      case "appointment":
        return <Calendar className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "case":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "document":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "client":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
      case "appointment":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  return (
    <div ref={searchRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search cases, documents, clients..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => setIsOpen(true)}
          className="pl-10 pr-20 transition-all duration-300 focus:ring-2 focus:ring-navy-500"
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Filter className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {filterOptions.map((option) => (
                <DropdownMenuCheckboxItem
                  key={option.value}
                  checked={selectedFilters.includes(option.value)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedFilters((prev) => [...prev, option.value])
                    } else {
                      setSelectedFilters((prev) => prev.filter((f) => f !== option.value))
                    }
                  }}
                >
                  <option.icon className="h-4 w-4 mr-2" />
                  {option.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {query && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQuery("")
                setIsOpen(false)
              }}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 max-h-96 overflow-y-auto shadow-lg border">
          <CardContent className="p-0">
            {/* Active Filters */}
            {selectedFilters.length > 0 && (
              <div className="p-3 border-b bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Filters:</span>
                  {selectedFilters.map((filter) => (
                    <Badge
                      key={filter}
                      variant="secondary"
                      className="text-xs cursor-pointer hover:bg-red-100 hover:text-red-800"
                      onClick={() => setSelectedFilters((prev) => prev.filter((f) => f !== filter))}
                    >
                      {filterOptions.find((f) => f.value === filter)?.label}
                      <X className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-navy-700 mx-auto"></div>
                <p className="text-sm text-gray-600 mt-2">Searching...</p>
              </div>
            )}

            {/* Search Results */}
            {!isLoading && query && results.length > 0 && (
              <div className="max-h-64 overflow-y-auto">
                {results.map((result) => (
                  <div
                    key={result.id}
                    className="p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-b last:border-b-0 transition-colors duration-200"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1">{getTypeIcon(result.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm truncate">
                            {highlightText(result.title, result.highlight || query)}
                          </h4>
                          <Badge className={`text-xs ${getTypeColor(result.type)}`}>{result.type}</Badge>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                          {highlightText(result.description, result.highlight || query)}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {result.date && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {result.date}
                            </span>
                          )}
                          {result.status && (
                            <Badge variant="outline" className="text-xs">
                              {result.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* No Results */}
            {!isLoading && query && results.length === 0 && (
              <div className="p-4 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">No results found for "{query}"</p>
              </div>
            )}

            {/* Recent Searches */}
            {!query && recentSearches.length > 0 && (
              <div className="p-3">
                <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Recent Searches</h4>
                <div className="space-y-1">
                  {recentSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => handleSearch(search)}
                      className="flex items-center gap-2 w-full text-left p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
                    >
                      <Clock className="h-3 w-3 text-gray-400" />
                      <span className="text-sm">{search}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
