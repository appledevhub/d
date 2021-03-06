import { Column, getItemNodeIdOrId, isItemSaved } from '@devhub/core'
import React, { useCallback, useMemo, useRef } from 'react'
import {
  StyleSheet,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
} from 'react-native'
import { useDispatch } from 'react-redux'

import { useDynamicRef } from '../../hooks/use-dynamic-ref'
import { useHover } from '../../hooks/use-hover'
import { useIsItemFocused } from '../../hooks/use-is-item-focused'
import { useItem } from '../../hooks/use-item'
import { useReduxState } from '../../hooks/use-redux-state'
import { emitter } from '../../libs/emitter'
import { Platform } from '../../libs/platform'
import * as actions from '../../redux/actions'
import * as selectors from '../../redux/selectors'
import { sharedStyles } from '../../styles/shared'
import { getLastUsedInputType, tryFocus } from '../../utils/helpers/shared'
import { getCardBackgroundThemeColor } from '../columns/ColumnRenderer'
import { Link, LinkProps } from '../common/Link'
import { getTheme } from '../context/ThemeContext'
import { BaseCard } from './BaseCard'
import { getCardPropsForItem } from './BaseCard.shared'
import { CardFocusIndicator } from './partials/CardFocusIndicator'
import { CardSavedIndicator } from './partials/CardSavedIndicator'

export interface CardWithLinkProps {
  columnId: string
  isInsideSwipeable?: boolean
  nodeIdOrId: string
  ownerIsKnown: boolean
  repoIsKnown: boolean
  type: Column['type']
}

export const CardWithLink = React.memo((props: CardWithLinkProps) => {
  const {
    columnId,
    isInsideSwipeable,
    nodeIdOrId,
    ownerIsKnown,
    repoIsKnown,
    type,
  } = props

  const ref = useRef<any>(null)
  const focusIndicatorRef = useRef<View>(null)
  const isFocusedRef = useRef(false)
  const isHoveredRef = useRef(false)

  const dispatch = useDispatch()
  const plan = useReduxState(selectors.currentUserPlanSelector)

  const item = useItem(nodeIdOrId)

  const { CardComponent, cardProps } = useMemo(() => {
    if (!item) {
      return {}
    }

    const _cardProps = getCardPropsForItem(type, item, {
      ownerIsKnown,
      plan,
      repoIsKnown,
    })

    return {
      cardProps: _cardProps,
      CardComponent: (
        <BaseCard
          key={`${type}-base-card-${getItemNodeIdOrId(item)!}`}
          {..._cardProps}
        />
      ),
    }
  }, [item, ownerIsKnown, plan, repoIsKnown])

  const isReadRef = useDynamicRef(!!(cardProps && cardProps.isRead))

  const onPress = useCallback<NonNullable<LinkProps['onPress']>>(
    e => {
      isHoveredRef.current = false

      if (e && e.isDefaultPrevented()) return

      dispatch(
        actions.openItem({
          columnType: type,
          columnId,
          itemNodeIdOrId: getItemNodeIdOrId(item)!,
          link: undefined,
        }),
      )
    },
    [type, columnId, getItemNodeIdOrId(item)!],
  )

  const updateStyles = useCallback(() => {
    if (ref.current) {
      const theme = getTheme()

      ref.current.setNativeProps({
        style: {
          backgroundColor:
            theme[
              getCardBackgroundThemeColor({
                isDark: theme.isDark,
                isMuted: isReadRef.current,
                isHovered: isHoveredRef.current,
              })
            ],
        },
      })
    }

    if (focusIndicatorRef.current) {
      focusIndicatorRef.current.setNativeProps({
        style: {
          opacity:
            getLastUsedInputType() === 'keyboard' && isFocusedRef.current
              ? 1
              : 0,
        },
      })
    }
  }, [])

  const handleFocusChange = useCallback(
    (value, disableDomFocus?: boolean) => {
      const changed = isFocusedRef.current !== value
      isFocusedRef.current = value

      if (Platform.OS === 'web' && value && changed && !disableDomFocus) {
        tryFocus(ref.current)
      }

      updateStyles()
    },
    [columnId],
  )

  useIsItemFocused(columnId, getItemNodeIdOrId(item)!, handleFocusChange)

  useHover(
    ref,
    useCallback(
      isHovered => {
        if (isHoveredRef.current === isHovered) return
        isHoveredRef.current = isHovered

        const isAlreadyFocused = isFocusedRef.current
        if (isHovered && !isAlreadyFocused) {
          handleFocusChange(true)

          emitter.emit('FOCUS_ON_COLUMN_ITEM', {
            columnId,
            itemNodeIdOrId: getItemNodeIdOrId(item)!,
          })
        } else {
          updateStyles()
        }
      },
      [columnId, getItemNodeIdOrId(item)!],
    ),
  )

  if (!(item && cardProps)) return null

  const isSaved = isItemSaved(item)

  return (
    <Link
      ref={ref}
      TouchableComponent={
        isInsideSwipeable ? GestureHandlerCardTouchable : NormalCardTouchable
      }
      backgroundThemeColor={theme =>
        getCardBackgroundThemeColor({
          isDark: theme.isDark,
          isMuted: cardProps.isRead,
          isHovered: !Platform.supportsTouch && isFocusedRef.current,
        })
      }
      data-card-link
      enableBackgroundHover={false}
      enableForegroundHover={false}
      href={cardProps.link}
      onPress={onPress}
      // onLongPress={
      //   swipeableInfoRef
      //     ? undefined
      //     : e => {
      //         if (!Platform.supportsTouch) return

      //         e.preventDefault()

      //         dispatch(
      //           actions.saveItemsForLater({
      //             itemNodeIdOrIds: [getItemNodeIdOrId(item)!],
      //             save: !isSaved,
      //           }),
      //         )
      //       }
      // }
      openOnNewTab
      style={sharedStyles.relative}
      onFocus={() => {
        if (isFocusedRef.current) return

        handleFocusChange(true, true)

        if (!Platform.supportsTouch) {
          emitter.emit('FOCUS_ON_COLUMN_ITEM', {
            columnId,
            itemNodeIdOrId: getItemNodeIdOrId(item)!,
          })
        }
      }}
      onBlur={() => {
        handleFocusChange(false, true)
      }}
    >
      {CardComponent}

      <CardFocusIndicator
        ref={focusIndicatorRef}
        style={{
          opacity:
            getLastUsedInputType() === 'keyboard' && isFocusedRef.current
              ? 1
              : 0,
        }}
      />

      {!!isSaved && <CardSavedIndicator />}
    </Link>
  )
})

CardWithLink.displayName = 'CardWithLink'

const GestureHandlerTouchableOpacity = Platform.select({
  android: () => require('react-native-gesture-handler').TouchableOpacity,
  ios: () => require('react-native-gesture-handler').TouchableOpacity,
  default: () => require('../common/TouchableOpacity').TouchableOpacity,
})()

const GestureHandlerCardTouchable = React.forwardRef<
  View,
  TouchableOpacityProps
>((props, ref) => {
  return (
    <View ref={ref} style={props.style}>
      <GestureHandlerTouchableOpacity
        accessible={false}
        activeOpacity={1}
        {...props}
        style={StyleSheet.flatten([
          props.style,
          { backgroundColor: 'transparent' },
        ])}
      />
    </View>
  )
})

const NormalCardTouchable = React.forwardRef<View, TouchableOpacityProps>(
  (props, ref) => {
    return (
      <View ref={ref} style={props.style}>
        <TouchableOpacity
          accessible={false}
          activeOpacity={Platform.supportsTouch ? 1 : undefined}
          {...props}
          style={[props.style, { backgroundColor: 'transparent' }]}
        />
      </View>
    )
  },
)
