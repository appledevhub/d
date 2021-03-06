import immer from 'immer'
import React, { useContext, useEffect, useRef, useState } from 'react'
import { Dimensions } from 'react-native'

import { useAppViewMode } from '../../hooks/use-app-view-mode'
import { useEmitter } from '../../hooks/use-emitter'
import { sizes as cardSizes } from '../cards/BaseCard.shared'
import { calculateColumnWidth, useColumnWidth } from './ColumnWidthContext'
import { useAppLayout } from './LayoutContext'

export interface ColumnFiltersProviderProps {
  children?: React.ReactNode
}

export interface ColumnFiltersProviderState {
  enableSharedFiltersView: boolean
  fixedWidth: number
  inlineMode: boolean
  isSharedFiltersOpened: boolean
}

const defaultValue: ColumnFiltersProviderState = {
  enableSharedFiltersView: false,
  fixedWidth: calculateColumnWidth({
    windowWidth: Dimensions.get('window').width,
  }),
  inlineMode: false,
  isSharedFiltersOpened: false,
}
export const ColumnFiltersContext = React.createContext<
  ColumnFiltersProviderState
>(defaultValue)
ColumnFiltersContext.displayName = 'ColumnFiltersContext'

export function ColumnFiltersProvider(props: ColumnFiltersProviderProps) {
  const { sizename } = useAppLayout()
  const { appViewMode } = useAppViewMode()
  const columnWidth = useColumnWidth()

  const enableSharedFiltersView =
    appViewMode === 'single-column' || sizename === '1-small'

  const inlineMode = appViewMode === 'single-column' && sizename >= '5-xx-large'

  const [isOpen, setIsOpened] = useState(inlineMode)

  const isSharedFiltersOpened =
    inlineMode || (enableSharedFiltersView && isOpen)

  const valueCacheRef = useRef<ColumnFiltersProviderState>({
    enableSharedFiltersView,
    fixedWidth:
      columnWidth -
      (cardSizes.cardPadding +
        cardSizes.avatarContainerWidth +
        cardSizes.horizontalSpaceSize),
    inlineMode,
    isSharedFiltersOpened,
  })

  useEffect(() => {
    if (!inlineMode && isSharedFiltersOpened) setIsOpened(false)
  }, [inlineMode])

  useEmitter(
    'TOGGLE_COLUMN_FILTERS',
    payload => {
      if (!enableSharedFiltersView) return
      setIsOpened(
        typeof payload.isOpen === 'boolean' ? payload.isOpen : v => !v,
      )
    },
    [enableSharedFiltersView],
  )

  valueCacheRef.current = immer(valueCacheRef.current, draft => {
    draft.enableSharedFiltersView = enableSharedFiltersView
    draft.inlineMode = inlineMode
    draft.isSharedFiltersOpened = isSharedFiltersOpened
  })

  return (
    <ColumnFiltersContext.Provider value={valueCacheRef.current}>
      {props.children}
    </ColumnFiltersContext.Provider>
  )
}

export const ColumnFiltersConsumer = ColumnFiltersContext.Consumer
;(ColumnFiltersConsumer as any).displayName = 'ColumnFiltersConsumer'

export function useColumnFilters() {
  return useContext(ColumnFiltersContext)
}
