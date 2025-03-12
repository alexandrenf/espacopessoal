"use client"

import * as React from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "~/lib/utils"
import { Button } from "~/components/ui/button"
import { Calendar } from "~/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover"
import { Input } from "~/components/ui/input"

interface DateTimePickerProps {
  value?: Date
  onChange?: (date?: Date) => void
}

export function DateTimePicker({ value, onChange }: DateTimePickerProps) {
  const [selectedDateTime, setSelectedDateTime] = React.useState<Date | undefined>(
    value
  )

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      setSelectedDateTime(undefined)
      onChange?.(undefined)
      return
    }

    if (selectedDateTime) {
      date.setHours(selectedDateTime.getHours())
      date.setMinutes(selectedDateTime.getMinutes())
    }

    setSelectedDateTime(date)
    onChange?.(date)
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = e.target.value
    if (!time || !selectedDateTime) return

    const [hours, minutes] = time.split(':')
    const newDateTime = new Date(selectedDateTime)
    newDateTime.setHours(parseInt(hours ?? '0', 10))
    newDateTime.setMinutes(parseInt(minutes ?? '0', 10))

    setSelectedDateTime(newDateTime)
    onChange?.(newDateTime)
  }

  return (
    <div className="flex gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-[280px] justify-start text-left font-normal",
              !selectedDateTime && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDateTime ? (
              format(selectedDateTime, "PPP")
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selectedDateTime}
            onSelect={handleDateSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      <Input
        type="time"
        value={selectedDateTime ? format(selectedDateTime, "HH:mm") : ""}
        onChange={handleTimeChange}
        className="w-[120px]"
      />
    </div>
  )
}

export type { DateTimePickerProps }
