import BubbleIcon from '@/components/ui/Bubble-icon'
import { cn } from '@/lib/utils'
import React from 'react'

interface Props {
  className?: string
}
const Unauthorized = ({ className }: Props) => {
  return (
    <div className={cn('min-h-125 flex justify-center items-center', className)}>
      <div className='flex flex-col items-center gap-4 text-center'>
        <BubbleIcon icon='lucide:shield-ban' theme='red' iconSize={43} />
        <p className='text-lg text-muted-foreground max-w-sm'>
          No tienes permisos para acceder a esta sección.
        </p>
      </div>
    </div>
  )
}

export default Unauthorized
