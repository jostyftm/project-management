'use client'

import React from 'react'
import BaseIcon from '@/components/ui/base-icon'
import BubbleIcon from '@/components/ui/Bubble-icon'


const CheckingPermissions = () => {
  return (
    <div className='flex flex-col items-center absolute justify-center w-fit top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center text-muted-foreground space-y-4'>
      <BubbleIcon theme='blue' icon='lucide:shield-ellipsis' iconSize={43} />
      <p className='text-lg text-muted-foreground max-w-sm flex gap-2 justify-center items-center'>
        <BaseIcon name='Loader' size={20} className='animate-spin' />
        Validando permisos...
      </p>
    </div>
  )
}

export default CheckingPermissions
