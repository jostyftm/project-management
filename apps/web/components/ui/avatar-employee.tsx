'use client'
import React, { useMemo } from 'react'
import { cn, getInitials } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from './avatar'

const hexColors = [
  '#2563EB', // blue-600
  '#10B981', // emerald-500
  '#8B5CF6', // violet-500
  '#F97316', // orange-500
  '#F43F5E', // rose-500
  '#3F3F46', // zinc-700
  '#06B6D4', // cyan-500
  '#F59E0B', // amber-500
  '#A855F7', // purple-500
  '#22C55E', // green-500
  '#E11D48', // rose-600
  '#0EA5E9', // sky-500
  '#E879F9', // fuchsia-400
  '#4ADE80', // green-400
  '#C084FC', // purple-400
  '#818CF8', // indigo-400
  '#FB923C' // orange-400
]

interface Props {
  name: string
  showName?: boolean
  className?: string
  classNameAvatarContainer?: string
  fallbackClassName?: string
  img?: string
  isNeutralColor?:boolean
  color?: string
}

function hashStringToNumber(str: string) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0 // convierte a 32 bits
  }
  return Math.abs(hash)
}

const AvatarEmployee = ({
  name,
  img,
  className,
  showName,
  color,
  fallbackClassName,
  classNameAvatarContainer,
  isNeutralColor
}: Props) => {
  const colorHexa = useMemo(() => {
    if (isNeutralColor) return "#62748e"
    if (color) return color
    const index = hashStringToNumber(name) % hexColors.length
    return hexColors[index]
  }, [name, color, isNeutralColor])

  return (
    <div className={cn('flex items-center gap-3 ', classNameAvatarContainer)}>
          
      <Avatar className={cn('h-10 w-10', className)}>
        <AvatarImage src={img} alt={`avartar ${name}`} />
        <AvatarFallback
          className={cn(`font-semibold text-xs`, fallbackClassName)}
          style={{
            backgroundColor: `${colorHexa}33`,
            color: `${colorHexa}FF`,
            fontWeight: 'bold'
          }}
        >
          {getInitials(name)}{' '}
        </AvatarFallback>
      </Avatar>
      {showName && <div className='space-y-2 capitalize'>{name}</div>}
    </div>
  )
}

export default AvatarEmployee
