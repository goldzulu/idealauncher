'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'

interface IdeasFilterProps {
  sortBy: string
  sortOrder: string
  searchQuery: string
  scoreFilter: string
  onSortByChange: (value: string) => void
  onSortOrderChange: (value: string) => void
  onSearchChange: (value: string) => void
  onScoreFilterChange: (value: string) => void
}

export function IdeasFilter({
  sortBy,
  sortOrder,
  searchQuery,
  scoreFilter,
  onSortByChange,
  onSortOrderChange,
  onSearchChange,
  onScoreFilterChange,
}: IdeasFilterProps) {
  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search ideas..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={scoreFilter} onValueChange={onScoreFilterChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter by score" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ideas</SelectItem>
              <SelectItem value="scored">Scored Only</SelectItem>
              <SelectItem value="unscored">Unscored Only</SelectItem>
              <SelectItem value="high-ice">High ICE (≥7)</SelectItem>
              <SelectItem value="high-rice">High RICE (≥50)</SelectItem>
              <SelectItem value="top-performers">Top Performers</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={onSortByChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updatedAt">Last Updated</SelectItem>
              <SelectItem value="createdAt">Created Date</SelectItem>
              <SelectItem value="title">Title</SelectItem>
              <SelectItem value="iceScore">ICE Score</SelectItem>
              <SelectItem value="riceScore">RICE Score</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortOrder} onValueChange={onSortOrderChange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Order" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Descending</SelectItem>
              <SelectItem value="asc">Ascending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}