"use client"

import * as React from "react"
import { Calendar as CalendarIcon, Clock } from "lucide-react"
import { format } from "date-fns"
import { cn } from "~/lib/utils"
import { Button } from "~/components/ui/button"
import { Calendar } from "~/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover"

interface DateTimePickerProps {
  value?: Date
  onChange?: (date?: Date) => void
}

export function DateTimePicker({ value, onChange }: DateTimePickerProps) {
  const [selectedDateTime, setSelectedDateTime] = React.useState<Date | undefined>(
    value
  )
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false)
  const [isTimeOpen, setIsTimeOpen] = React.useState(false)

  const hours = Array.from({ length: 12 }, (_, i) => i + 1)
  const minutes = Array.from({ length: 4 }, (_, i) => i * 15)

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      setSelectedDateTime(undefined)
      onChange?.(undefined)
      return
    }

    const newDateTime = new Date(date)
    if (selectedDateTime) {
      newDateTime.setHours(selectedDateTime.getHours())
      newDateTime.setMinutes(selectedDateTime.getMinutes())
    }

    setSelectedDateTime(newDateTime)
    onChange?.(newDateTime)
    setIsCalendarOpen(false)
  }

  const handleTimeChange = (hour: number, minute: number, period: "AM" | "PM") => {
    if (!selectedDateTime) {
      const now = new Date()
      setSelectedDateTime(now)
      onChange?.(now)
      return
    }

    const newDateTime = new Date(selectedDateTime)
    const adjustedHour = hour === 12 
      ? (period === "AM" ? 0 : 12)
      : (period === "PM" ? hour + 12 : hour)
    
    newDateTime.setHours(adjustedHour)
    newDateTime.setMinutes(minute)

    setSelectedDateTime(newDateTime)
    onChange?.(newDateTime)
  }

  const getSelectedHour = () => {
    if (!selectedDateTime) return undefined
    const hour = selectedDateTime.getHours()
    if (hour === 0) return 12
    if (hour > 12) return hour - 12
    return hour
  }

  const getSelectedPeriod = () => {
    if (!selectedDateTime) return undefined
    return selectedDateTime.getHours() >= 12 ? "PM" : "AM"
  }

  return (
    <div className="flex gap-2">
      <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-[240px] justify-start text-left font-normal",
              !selectedDateTime && "text-muted-foreground"
            )}
            role="combobox"
            aria-expanded={isCalendarOpen}
            aria-label="Select date"
            type="button"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDateTime ? (
              format(selectedDateTime, "PPP")
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDateTime}
            onSelect={handleDateSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      <Popover open={isTimeOpen} onOpenChange={setIsTimeOpen}>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-[120px] justify-start text-left font-normal",
              !selectedDateTime && "text-muted-foreground"
            )}
            role="combobox"
            aria-expanded={isTimeOpen}
            aria-label="Select time"
            type="button"
          >
            <Clock className="mr-2 h-4 w-4" />
            {selectedDateTime ? (
              format(selectedDateTime, "h:mm a")
            ) : (
              <span>Set time</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <div className="grid grid-cols-2 gap-2 p-3">
            <div className="flex flex-col items-center gap-2">
              <div className="text-sm font-medium text-muted-foreground mb-1">Hours</div>
              <div className="grid grid-cols-3 gap-1">
                {hours.map((hour) => (
                  <Button
                    key={hour}
                    variant="ghost"
                    className={cn(
                      "h-8",
                      getSelectedHour() === hour && "bg-primary text-primary-foreground"
                    )}
                    onClick={() => {
                      handleTimeChange(
                        hour,
                        selectedDateTime?.getMinutes() ?? 0,
                        getSelectedPeriod() ?? "AM"
                      )
                    }}
                    type="button"
                  >
                    {hour.toString().padStart(2, '0')}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="text-sm font-medium text-muted-foreground mb-1">Minutes</div>
              <div className="flex flex-col gap-1">
                {minutes.map((minute) => (
                  <Button
                    key={minute}
                    variant="ghost"
                    className={cn(
                      "h-8",
                      selectedDateTime?.getMinutes() === minute && "bg-primary text-primary-foreground"
                    )}
                    onClick={() => {
                      handleTimeChange(
                        getSelectedHour() ?? 12,
                        minute,
                        getSelectedPeriod() ?? "AM"
                      )
                    }}
                    type="button"
                  >
                    {minute.toString().padStart(2, '0')}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t p-3">
            <div className="flex justify-center gap-2">
              {(["AM", "PM"] as const).map((period) => (
                <Button
                  key={period}
                  variant="ghost"
                  className={cn(
                    "h-8 w-12",
                    getSelectedPeriod() === period && "bg-primary text-primary-foreground"
                  )}
                  onClick={() => {
                    handleTimeChange(
                      getSelectedHour() ?? 12,
                      selectedDateTime?.getMinutes() ?? 0,
                      period
                    )
                    setIsTimeOpen(false)
                  }}
                  type="button"
                >
                  {period}
                </Button>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

export type { DateTimePickerProps }
