"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Calendar, ChevronLeft, ChevronRight, Search, Filter, X } from "lucide-react"

// Define interfaces for better type safety
interface CategoryConfig {
  color: string
  lightColor: string
  borderColor: string
}

interface Categories {
  "To Do": CategoryConfig
  "In Progress": CategoryConfig
  Review: CategoryConfig
  Completed: CategoryConfig
  [key: string]: CategoryConfig // Allow indexing with string
}

interface Task {
  id: number
  name: string
  category: string
  startDate: string
  endDate: string
}

interface ModalData {
  name: string
  category: string
  isEdit: boolean
  taskId: number | null
}

interface DurationFilter {
  label: string
  value: string
}

// Task categories with proper colors
const CATEGORIES: Categories = {
  "To Do": { color: "bg-blue-500", lightColor: "bg-blue-50", borderColor: "#3B82F6" },
  "In Progress": { color: "bg-orange-500", lightColor: "bg-orange-50", borderColor: "#F97316" },
  Review: { color: "bg-purple-500", lightColor: "bg-purple-50", borderColor: "#8B5CF6" },
  Completed: { color: "bg-green-500", lightColor: "bg-green-50", borderColor: "#10B981" },
}

const DURATION_FILTERS: DurationFilter[] = [
  { label: "All Tasks", value: "all" },
  { label: "Tasks within 1 week", value: "1week" },
  { label: "Tasks within 2 weeks", value: "2weeks" },
  { label: "Tasks within 3 weeks", value: "3weeks" },
]

// Utility functions
const getDaysInMonth = (year: number, month: number): number => new Date(year, month + 1, 0).getDate()
const getFirstDayOfMonth = (year: number, month: number): number => new Date(year, month, 1).getDay()
const formatDate = (date: Date): string => {
  // Ensure we're working with a proper Date object and format correctly
  const d = new Date(date)
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0")
}
const isSameDay = (date1: Date, date2: Date): boolean => formatDate(date1) === formatDate(date2)
const isToday = (date: Date): boolean => isSameDay(date, new Date())

// Parse date string back to Date object
const parseDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split("-").map(Number)
  return new Date(year, month - 1, day)
}

const TaskPlanner: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [tasks, setTasks] = useState<Task[]>([])
  const [isSelecting, setIsSelecting] = useState<boolean>(false)
  const [selectionStart, setSelectionStart] = useState<Date | null>(null)
  const [_selectionEnd, setSelectionEnd] = useState<Date | null>(null)
  const [selectedDays, setSelectedDays] = useState<Date[]>([])
  const [showModal, setShowModal] = useState<boolean>(false)
  const [modalData, setModalData] = useState<ModalData>({ name: "", category: "To Do", isEdit: false, taskId: null })
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [resizingTask, setResizingTask] = useState<number | null>(null)
  const [resizeType, setResizeType] = useState<"resize-left" | "resize-right" | null>(null)
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [categoryFilters, setCategoryFilters] = useState<string[]>(Object.keys(CATEGORIES))
  const [durationFilter, setDurationFilter] = useState<string>("all")
  const [showFiltersModal, setShowFiltersModal] = useState<boolean>(false)
  const [hoveredTask, setHoveredTask] = useState<Task | null>(null)

  const calendarRef = useRef<HTMLDivElement>(null)

  // Load tasks from localStorage on mount
  useEffect(() => {
    const savedTasks = localStorage.getItem("taskPlannerTasks")
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks))
    }
  }, [])

  // Save tasks to localStorage whenever tasks change
  useEffect(() => {
    localStorage.setItem("taskPlannerTasks", JSON.stringify(tasks))
  }, [tasks])

  const year: number = currentDate.getFullYear()
  const month: number = currentDate.getMonth()
  const daysInMonth: number = getDaysInMonth(year, month)
  const firstDay: number = getFirstDayOfMonth(year, month)

  // Generate calendar days
  const calendarDays: (Date | null)[] = []
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null)
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(new Date(year, month, day))
  }

  // Navigation
  const navigateMonth = (direction: number): void => {
    setCurrentDate(new Date(year, month + direction, 1))
  }

  // Day selection for task creation
  const handleDayMouseDown = (date: Date | null, e: React.MouseEvent<HTMLDivElement>): void => {
    if (!date) return
    e.preventDefault()
    setIsSelecting(true)
    setSelectionStart(date)
    setSelectionEnd(date)
    setSelectedDays([date])
  }

  const handleDayMouseEnter = (date: Date | null): void => {
    if (!isSelecting || !date || !selectionStart) return

    const start = selectionStart
    const end = date
    const startTime = start.getTime()
    const endTime = end.getTime()

    const days: Date[] = []
    const current = new Date(Math.min(startTime, endTime))
    const maxTime = Math.max(startTime, endTime)

    while (current.getTime() <= maxTime) {
      days.push(new Date(current.getTime())) // Create new date object to avoid reference issues
      current.setDate(current.getDate() + 1)
    }

    setSelectedDays(days)
    setSelectionEnd(date)
  }

  const handleMouseUp = (): void => {
    if (isSelecting && selectedDays.length > 0) {
      setModalData({ name: "", category: "To Do", isEdit: false, taskId: null })
      setShowModal(true)
    }
    setIsSelecting(false)
  }

  // Task creation and editing
  const handleTaskSubmit = (): void => {
    if (!modalData.name.trim()) return
    if (modalData.isEdit) {
      setTasks(
        tasks.map((task) =>
          task.id === modalData.taskId ? { ...task, name: modalData.name, category: modalData.category } : task,
        ),
      )
    } else {
      const newTask: Task = {
        id: Date.now(),
        name: modalData.name,
        category: modalData.category,
        startDate: formatDate(selectedDays[0]),
        endDate: formatDate(selectedDays[selectedDays.length - 1]),
      }
      setTasks([...tasks, newTask])
    }
    setShowModal(false)
    setSelectedDays([])
    setModalData({ name: "", category: "To Do", isEdit: false, taskId: null })
  }

  // Task drag and drop
  const handleTaskMouseDown = (
    task: Task,
    e: React.MouseEvent<HTMLDivElement>,
    type: "move" | "resize-left" | "resize-right" = "move",
  ): void => {
    e.stopPropagation()

    if (type === "resize-left" || type === "resize-right") {
      setResizingTask(task.id)
      setResizeType(type)
    } else {
      setDraggedTask(task)
    }
  }

  const handleTaskDrop = (targetDate: Date | null): void => {
    if (draggedTask && targetDate) {
      const taskStart = parseDate(draggedTask.startDate)
      const taskEnd = parseDate(draggedTask.endDate)
      const taskDuration = taskEnd.getTime() - taskStart.getTime()

      const newStartDate = formatDate(targetDate)
      const newEndDate = formatDate(new Date(targetDate.getTime() + taskDuration))

      setTasks(
        tasks.map((task) =>
          task.id === draggedTask.id ? { ...task, startDate: newStartDate, endDate: newEndDate } : task,
        ),
      )
    }
    setDraggedTask(null)
  }

  const handleTaskResize = (targetDate: Date | null): void => {
    if (resizingTask && targetDate) {
      const task = tasks.find((t) => t.id === resizingTask)
      if (!task) return
      let newStartDate: string, newEndDate: string

      if (resizeType === "resize-left") {
        newStartDate = formatDate(targetDate)
        newEndDate = task.endDate
        if (parseDate(newStartDate) > parseDate(newEndDate)) {
          newEndDate = newStartDate
        }
      } else {
        newStartDate = task.startDate
        newEndDate = formatDate(targetDate)
        if (parseDate(newEndDate) < parseDate(newStartDate)) {
          newStartDate = newEndDate
        }
      }

      setTasks(tasks.map((t) => (t.id === resizingTask ? { ...t, startDate: newStartDate, endDate: newEndDate } : t)))
    }
    setResizingTask(null)
    setResizeType(null)
  }

  const handleDayMouseUpForDrop = (date: Date | null): void => {
    if (draggedTask) {
      handleTaskDrop(date)
    } else if (resizingTask) {
      handleTaskResize(date)
    } else {
      handleMouseUp()
    }
  }

  // Task filtering
  const getFilteredTasks = (): Task[] => {
    return tasks.filter((task) => {
      // Search filter - fix: trim whitespace and handle empty search
      if (searchTerm && searchTerm.trim() && !task.name.toLowerCase().includes(searchTerm.trim().toLowerCase())) {
        return false
      }

      // Category filter
      if (!categoryFilters.includes(task.category)) {
        return false
      }

      // Duration filter
      if (durationFilter !== "all") {
        const taskStart = new Date(task.startDate)
        const today = new Date()
        today.setHours(0, 0, 0, 0) // Reset time to start of day
        taskStart.setHours(0, 0, 0, 0) // Reset time to start of day

        const diffTime = Math.abs(taskStart.getTime() - today.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        const maxDays: number =
          {
            "1week": 7,
            "2weeks": 14,
            "3weeks": 21,
          }[durationFilter] || 0 // Default to 0 if filter not found

        if (diffDays > maxDays) {
          return false
        }
      }

      return true
    })
  }

  // Get tasks that start on a specific day (for rendering)
  const getTasksStartingOnDay = (date: Date | null): Task[] => {
    if (!date) return []
    const dateStr = formatDate(date)
    return getFilteredTasks().filter((task) => task.startDate === dateStr)
  }

  // Calculate task span and position
  const getTaskSpanInfo = (task: Task, startDate: Date) => {
    const taskStart = parseDate(task.startDate)
    const taskEnd = parseDate(task.endDate)
    const currentStart = new Date(startDate)

    // Calculate how many days this task spans
    const timeDiff = taskEnd.getTime() - taskStart.getTime()
    const totalDays = Math.floor(timeDiff / (1000 * 60 * 60 * 24)) + 1

    // Calculate how many days are visible in current month from task start
    const monthEnd = new Date(currentStart.getFullYear(), currentStart.getMonth() + 1, 0)
    const visibleEnd = taskEnd > monthEnd ? monthEnd : taskEnd
    const visibleStart = taskStart < currentStart ? currentStart : taskStart
    const visibleTimeDiff = visibleEnd.getTime() - visibleStart.getTime()
    const visibleDays = Math.floor(visibleTimeDiff / (1000 * 60 * 60 * 24)) + 1

    return {
      totalDays,
      visibleDays: Math.max(1, visibleDays),
      taskStart,
      taskEnd,
    }
  }

  // Navigate to month containing a specific date
  const navigateToDate = (targetDateStr: string): void => {
    const date = parseDate(targetDateStr)
    setCurrentDate(new Date(date.getFullYear(), date.getMonth(), 1))
  }

  // Search and navigate to task
  const handleSearchAndNavigate = (searchValue: string): void => {
    setSearchTerm(searchValue)
    if (searchValue.trim()) {
      // Find first matching task
      const matchingTask = tasks.find((task) => task.name.toLowerCase().includes(searchValue.trim().toLowerCase()))
      if (matchingTask) {
        // Navigate to the month containing this task
        navigateToDate(matchingTask.startDate)
      }
    }
  }

  const deleteTask = (taskId: number): void => {
    setTasks(tasks.filter((task) => task.id !== taskId))
  }

  const editTask = (task: Task): void => {
    setModalData({
      name: task.name,
      category: task.category,
      isEdit: true,
      taskId: task.id,
    })
    setShowModal(true)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <Calendar className="w-8 h-8 text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">Task Planner</h1>
            </div>
            <button
              onClick={() => setShowFiltersModal(!showFiltersModal)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>
          </div>

          {/* Search and Filters */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search tasks by name..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  handleSearchAndNavigate(e.target.value)
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
        {/* Calendar Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigateMonth(-1)}
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <h2 className="text-2xl font-bold text-gray-900">
            {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </h2>

          <button
            onClick={() => navigateMonth(1)}
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {/* Calendar */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {/* Week Headers */}
          <div className="grid grid-cols-7 bg-gray-100">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="p-4 text-center font-semibold text-gray-700">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div
            ref={calendarRef}
            className="grid grid-cols-7"
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              setIsSelecting(false)
              setDraggedTask(null)
              setResizingTask(null)
              setHoveredTask(null)
            }}
          >
            {calendarDays.map((date, index) => (
              <div
                key={index}
                className={`min-h-28 border border-gray-200 relative cursor-pointer transition-all duration-200 ${
                  date ? "hover:bg-blue-50" : "bg-gray-50"
                } ${selectedDays.some((d) => date && isSameDay(d, date)) ? "bg-blue-100 ring-2 ring-blue-400" : ""} ${
                  date && isToday(date) ? "bg-blue-50 ring-2 ring-blue-500" : ""
                }`}
                onMouseDown={(e) => handleDayMouseDown(date, e)}
                onMouseEnter={() => handleDayMouseEnter(date)}
                onMouseUp={() => handleDayMouseUpForDrop(date)}
              >
                {date && (
                  <>
                    <div
                      className={`text-sm font-semibold p-1 ${
                        isToday(date)
                          ? "text-blue-700 bg-blue-100 rounded-full w-6 h-6 flex items-center justify-center m-1"
                          : "text-gray-600 m-1"
                      }`}
                    >
                      {date.getDate()}
                    </div>

                    {/* Tasks */}
                    <div className="px-1 space-y-0.5 relative">
                      {getTasksStartingOnDay(date).map((task, taskIndex) => {
                        const category = CATEGORIES[task.category]
                        const spanInfo = getTaskSpanInfo(task, date)
                        const dayOfWeek = date.getDay()
                        const remainingDaysInWeek = 6 - dayOfWeek // Days left in current week
                        const displayWidth = Math.min(spanInfo.visibleDays, remainingDaysInWeek + 1)

                        return (
                          <div
                            key={`${task.id}-${formatDate(date)}`}
                            className={`absolute text-xs px-2 py-1 rounded-sm cursor-move transition-all duration-200 border-l-4 z-10 ${category.lightColor} ${
                              draggedTask?.id === task.id ? "opacity-50 scale-105" : ""
                            } ${
                              resizingTask === task.id ? "ring-2 ring-blue-400" : ""
                            } group hover:shadow-lg hover:z-20 hover:scale-105`}
                            style={{
                              borderLeftColor: CATEGORIES[task.category].borderColor,
                              top: `${20 + taskIndex * 20}px`, // Stack tasks vertically
                              left: "4px",
                              width: `calc(${displayWidth * 100}% - 8px)`, // Span across multiple days
                              minHeight: "16px",
                            }}
                            onMouseDown={(e) => handleTaskMouseDown(task, e)}
                            onMouseEnter={() => setHoveredTask(task)}
                            onMouseLeave={() => setHoveredTask(null)}
                            onClick={(e) => {
                              e.stopPropagation()
                              editTask(task)
                            }}
                          >
                            {/* Resize handles */}
                            <div
                              className="absolute left-0 top-0 bottom-0 w-1 cursor-ew-resize bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-l-sm"
                              onMouseDown={(e) => handleTaskMouseDown(task, e, "resize-left")}
                            />
                            <div
                              className="absolute right-0 top-0 bottom-0 w-1 cursor-ew-resize bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-r-sm"
                              onMouseDown={(e) => handleTaskMouseDown(task, e, "resize-right")}
                            />

                            <div className="flex items-center justify-between min-h-4">
                              <span className="font-medium text-gray-800 truncate text-xs leading-tight flex-1">
                                {task.name}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  deleteTask(task.id)
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-gray-400 hover:text-red-500 flex-shrink-0"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>

                            {/* Enhanced Tooltip */}
                            {hoveredTask?.id === task.id && (
                              <div className="absolute z-50 top-full left-0 mt-2 p-3 bg-gray-900 text-white text-xs rounded-lg shadow-xl whitespace-nowrap border border-gray-700">
                                <div className="font-semibold text-white mb-1">{task.name}</div>
                                <div className="text-gray-300 mb-1">
                                  <span className={`inline-block w-2 h-2 rounded-full mr-2 ${category.color}`}></span>
                                  {task.category}
                                </div>
                                <div className="text-gray-400 text-xs">
                                  {parseDate(task.startDate).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })}{" "}
                                  -{" "}
                                  {parseDate(task.endDate).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </div>
                                <div className="text-gray-400 text-xs">
                                  Duration: {spanInfo.totalDays} day{spanInfo.totalDays > 1 ? "s" : ""}
                                </div>
                                {/* Tooltip arrow */}
                                <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 border-l border-t border-gray-700 rotate-45"></div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
        {/* Task Creation/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4">{modalData.isEdit ? "Edit Task" : "Create Task"}</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Task Name</label>
                  <input
                    type="text"
                    value={modalData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setModalData({ ...modalData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter task name..."
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select
                    value={modalData.category}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                      setModalData({ ...modalData, category: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {Object.keys(CATEGORIES).map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                {!modalData.isEdit && selectedDays.length > 0 && (
                  <div className="text-sm text-gray-600">
                    Duration: {selectedDays[0].toLocaleDateString()} -{" "}
                    {selectedDays[selectedDays.length - 1].toLocaleDateString()}({selectedDays.length} day
                    {selectedDays.length > 1 ? "s" : ""})
                  </div>
                )}
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowModal(false)
                    setSelectedDays([])
                    setModalData({ name: "", category: "To Do", isEdit: false, taskId: null })
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTaskSubmit}
                  disabled={!modalData.name.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {modalData.isEdit ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Filters Modal */}
        {showFiltersModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 max-w-md mx-4 max-h-96 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Filters</h3>
                <button onClick={() => setShowFiltersModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Category Filters */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Categories</h4>
                  <div className="space-y-2">
                    {Object.keys(CATEGORIES).map((category) => (
                      <label key={category} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={categoryFilters.includes(category)}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            if (e.target.checked) {
                              setCategoryFilters([...categoryFilters, category])
                            } else {
                              setCategoryFilters(categoryFilters.filter((c) => c !== category))
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{category}</span>
                        <div className={`ml-2 w-3 h-3 rounded-full ${CATEGORIES[category].color}`}></div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Duration Filters */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Duration</h4>
                  <div className="space-y-2">
                    {DURATION_FILTERS.map((filter) => (
                      <label key={filter.value} className="flex items-center">
                        <input
                          type="radio"
                          name="duration"
                          value={filter.value}
                          checked={durationFilter === filter.value}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDurationFilter(e.target.value)}
                          className="border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{filter.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => {
                    setCategoryFilters(Object.keys(CATEGORIES))
                    setDurationFilter("all")
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={() => setShowFiltersModal(false)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default TaskPlanner
