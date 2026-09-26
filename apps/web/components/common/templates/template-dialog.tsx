import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

import React from 'react'

interface TemplateDialogProps {
  title?: string
  descripction?: string
  children: React.ReactNode
  className?: string
  ClassNameContainer?: string
  open: boolean
  setOpen: (open: boolean) => void
}

const TemplateDialog = ({
  title = '',
  descripction = '',
  children,
  className,
  open,
  ClassNameContainer,
  setOpen
}: TemplateDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => setOpen(isOpen)}>
      <DialogContent
        className={cn('sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden', className)}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className={cn('', title === '' && descripction === '' ? 'hidden' : '')}>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{descripction}</DialogDescription>
        </DialogHeader>
        <div className={cn('flex-1 overflow-y-auto max-h-[calc(90vh-7rem)] px-2', ClassNameContainer)}>{children}</div>
      </DialogContent>
    </Dialog>
  )
}

export default TemplateDialog
