// components/TaskList.tsx
"use client"

import { useState } from 'react';

interface Task {
  id: string;
  title: string;
  description?: string;
  type: string;
  priority: string;
  dueDate: string;
  status: string;
  analyzedEvent: {
    eventTitle: string;
    eventStart: string;
  };
}

interface TaskGroups {
  overdue: Task[];
  thisWeek: Task[];
  nextWeek: Task[];
  later: Task[];
}

interface TaskListProps {
  tasks: TaskGroups;
  onTaskComplete: (taskId: string) => void;
  onTaskDismiss: (taskId: string) => void;
}

export function TaskList({ tasks, onTaskComplete, onTaskDismiss }: TaskListProps) {
  const [expandedSections, setExpandedSections] = useState({
    overdue: true,
    thisWeek: true,
    nextWeek: true,
    later: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-white bg-red-600';
      case 'medium': return 'text-white bg-yellow-600';
      case 'low': return 'text-white bg-green-600';
      default: return 'text-white bg-gray-600';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'booking': return '📅';
      case 'shopping': return '🛍️';
      case 'preparation': return '✅';
      case 'reminder': return '⏰';
      default: return '📌';
    }
  };

  const renderTaskSection = (
    title: string,
    tasks: Task[],
    sectionKey: keyof typeof expandedSections,
    isOverdue = false
  ) => {
    if (tasks.length === 0) return null;

    return (
      <div className="mb-6">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex items-center justify-between mb-3 text-left hover:bg-gray-50 p-2 rounded transition-colors"
        >
          <h3 className={`text-lg font-semibold ${isOverdue ? 'text-red-700' : 'text-gray-900'}`}>
            {title} ({tasks.length})
          </h3>
          <span className="text-gray-600 text-xl font-bold">
            {expandedSections[sectionKey] ? '−' : '+'}
          </span>
        </button>

        {expandedSections[sectionKey] && (
          <div className="space-y-2">
            {tasks.map(task => (
              <div
                key={task.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{getTypeIcon(task.type)}</span>
                      <h4 className="font-semibold text-gray-900">{task.title}</h4>
                      <span className={`text-xs px-2 py-1 rounded font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>
                    
                    {task.description && (
                      <p className="text-sm text-gray-700 mb-2">{task.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      <span className="font-medium">📅 {formatDate(task.dueDate)}</span>
                      <span className="font-medium">For: {task.analyzedEvent.eventTitle}</span>
                      <span className="font-medium">
                        Event: {formatDate(task.analyzedEvent.eventStart)}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => onTaskComplete(task.id)}
                      className="text-green-700 hover:bg-green-100 p-2 rounded transition-colors font-bold text-lg"
                      title="Mark complete"
                    >
                      ✓
                    </button>
                    <button
                      onClick={() => onTaskDismiss(task.id)}
                      className="text-gray-600 hover:bg-gray-100 p-2 rounded transition-colors font-bold text-lg"
                      title="Dismiss"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {renderTaskSection('⚠️ Overdue', tasks.overdue, 'overdue', true)}
      {renderTaskSection('This Week', tasks.thisWeek, 'thisWeek')}
      {renderTaskSection('Next Week', tasks.nextWeek, 'nextWeek')}
      {renderTaskSection('Later', tasks.later, 'later')}
      
      {tasks.overdue.length === 0 && 
       tasks.thisWeek.length === 0 && 
       tasks.nextWeek.length === 0 && 
       tasks.later.length === 0 && (
        <p className="text-gray-500 text-center py-8">
          No tasks suggested yet. Your calendar will be analyzed shortly...
        </p>
      )}
    </div>
  );
}