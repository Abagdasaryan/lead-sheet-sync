
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MobileDataCardProps {
  data: Record<string, any>;
  onEdit?: (data: Record<string, any>) => void;
  onAction?: (action: string, data: Record<string, any>) => void;
  primaryField: string;
  secondaryField?: string;
  statusField?: string;
  dateField?: string;
  additionalFields?: string[];
}

export const MobileDataCard = ({
  data,
  onEdit,
  onAction,
  primaryField,
  secondaryField,
  statusField,
  dateField,
  additionalFields = [],
}: MobileDataCardProps) => {
  const getStatusColor = (status: string) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower.includes('confirmed') || statusLower.includes('won') || statusLower.includes('closed - won')) {
      return 'bg-green-100 text-green-800 border-green-200';
    }
    if (statusLower.includes('pending') || statusLower.includes('scheduled')) {
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
    if (statusLower.includes('cancelled') || statusLower.includes('lost') || statusLower.includes('closed - lost')) {
      return 'bg-red-100 text-red-800 border-red-200';
    }
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <Card className="mb-3 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate mb-1">
              {data[primaryField] || 'N/A'}
            </h3>
            {secondaryField && (
              <p className="text-xs text-muted-foreground truncate">
                {data[secondaryField]}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-2 ml-2">
            {statusField && data[statusField] && (
              <Badge variant="outline" className={`text-xs ${getStatusColor(data[statusField])}`}>
                {data[statusField]}
              </Badge>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(data)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                )}
                {onAction && (
                  <DropdownMenuItem onClick={() => onAction('view', data)}>
                    View Details
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          {dateField && data[dateField] && (
            <div>
              <span className="text-muted-foreground">Date:</span>
              <span className="ml-1 font-medium">{data[dateField]}</span>
            </div>
          )}
          
          {additionalFields.map((field) => (
            data[field] && (
              <div key={field} className="truncate">
                <span className="text-muted-foreground">{field}:</span>
                <span className="ml-1 font-medium">{data[field]}</span>
              </div>
            )
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
