import cx from 'classnames'
import _ from 'lodash'
import PropTypes from 'prop-types'
import React from 'react'
import { DraggableCore } from 'react-draggable'

import {
  AutoControlledComponent as Component,
  createHTMLLabel,
  customPropTypes,
  getElementType,
  getUnhandledProps,
  htmlInputAttrs,
  makeDebugger,
  META,
  partitionHTMLProps,
  useKeyOnly,
} from '../../lib'

const _meta = {
  name: 'Slider',
  type: META.TYPES.MODULE,
}

const precision = 4

const debug = makeDebugger('slider')

/**
 * Class Name Constants
 */
const UPPER_BOUND = 'upperBound'
const LOWER_BOUND = 'lowerBound'

/**
 * Utility Functions
 */
/** from mdn => /JavaScript/Reference/Global_Objects/Math/round#A_better_solution */
function precisionRound(n, p = precision) {
  const shift = (num, exponent) => {
    const numArray = `${num}`.split('e')
    return +`${numArray[0]}e${numArray[1] ? +numArray[1] + exponent : exponent}`
  }
  return shift(Math.round(shift(n, +p)), -p)
}

function constrainNum(num, min, max) {
  if (num < min) return min
  if (num > max) return max
  return num
}

function findNumDigits(num, count, max = precision) {
  const c = count || 0
  if (!!max && max < c + 1) {
    return false
  }
  if ((num * 10 ** c) % 1 !== 0) {
    return findNumDigits(num, c + 1, max)
  }
  return c
}

// Javascript has error trying to mod using floats. This is a workaround up to X decimal places.
function floatModDiv(dividend, divisor) {
  const pad = 10 ** Math.max(findNumDigits(dividend), findNumDigits(divisor))
  if ((divisor * pad) % 1 !== 0) {
    throw new Error('There was an unexpected math error with Slider')
  }
  return ((dividend * pad) % (divisor * pad)) / pad
}

function invertPct(num) {
  return 100 - num
}

/**
 * A slider allows a user to select a value range
 */
export default class Slider extends Component {
  static propTypes = {
    /** An element type to render as (string or function). */
    as: customPropTypes.as,

    /** Additional classes. */
    className: PropTypes.string,

    /** A slider can appear disabled and be unable to change states */
    disabled: PropTypes.bool,

    /** Removes padding for a label. Auto applied when there is no label. */
    fitted: PropTypes.bool,

    /** A unique identifier. */
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),

    /** The text of the associated label element. */
    label: customPropTypes.itemShorthand,

    lower: PropTypes.number,

    /** The maximum value for the slider range */
    max: PropTypes.number,

    /** The minimum value for the slider range */
    min: PropTypes.number,

    /** The HTML input name. */
    name: PropTypes.string,

    /**
     * Called when the user attempts to change the checked state.
     *
     * @param {SyntheticEvent} event - React's original SyntheticEvent.
     * @param {object} data - All props and proposed checked/indeterminate state.
     */
    onChange: PropTypes.func,

    /**
     * Called when the slider or label is clicked.
     *
     * @param {SyntheticEvent} event - React's original SyntheticEvent.
     * @param {object} data - All props and current checked/indeterminate state.
     */
    onClick: PropTypes.func,

    /**
     * Called when the user presses down on the mouse.
     *
     * @param {SyntheticEvent} event - React's original SyntheticEvent.
     * @param {object} data - All props and current checked/indeterminate state.
     */
    onMouseDown: PropTypes.func,

    upper: PropTypes.number,

    /** If reversed, order values from greatest to lowest */
    reversed: PropTypes.bool,

    /** Dragging handles can lock to the increment or they can be smooth */
    smooth: PropTypes.bool,

    /** The start value for the lower handle in a slider */
    lowerStart: (props, propName, componentName) => {
      const prop = props[propName]
      if (!prop) {
        if (!props.upperStart) {
          return new Error(
            `Invalid prop ${propName} supplied to ${componentName}. ${propName} is conditionally required.`,
          )
        }
      } else {
        if (_.isNumber(props.max) && prop > props.max) {
          return new Error(
            `Invalid prop ${propName} supplied to ${componentName}. ${propName} cannot exceed prop "max".`,
          )
        }
        if (props.upperStart && _.isNumber(props.upperStart) && prop > props.upperStart) {
          return new Error(
            `Invalid prop ${propName} supplied to ${componentName}. prop upperStart cannot exceed ${propName}.`,
          )
        }
        if (_.isNumber(props.min) && prop < props.min) {
          return new Error(
            `Invalid prop ${propName} supplied to ${componentName}. prop "min" cannot exceed prop ${propName}.`,
          )
        }
      }
    },

    /** The start value for the upper handle in a slider */
    upperStart: (props, propName, componentName) => {
      const prop = props[propName]
      if (!prop) {
        if (!props.lowerStart) {
          return new Error(
            `Invalid prop ${propName} supplied to ${componentName}. ${propName} is conditionally required.`,
          )
        }
      } else {
        if (_.isNumber(props.max) && prop > props.max) {
          return new Error(
            `Invalid prop ${propName} supplied to ${componentName}. ${propName} cannot exceed prop "max".`,
          )
        }
        if (props.lowerStart && _.isNumber(props.lowerStart) && prop < props.lowerStart) {
          return new Error(
            `Invalid prop ${propName} supplied to ${componentName}. prop lowerStart cannot exceed ${propName}.`,
          )
        }
        if (_.isNumber(props.min) && prop < props.min) {
          return new Error(
            `Invalid prop ${propName} supplied to ${componentName}. prop "min" cannot exceed prop ${propName}.`,
          )
        }
      }
    },

    /** The value each slider increment. 0 will return real values. */
    increment: (props, propName, componentName) => {
      const prop = props[propName]
      if (!_.isNumber(prop)) {
        return new Error(
          `Invalid prop ${propName} supplied to ${componentName}. Must be of type: Number`,
        )
      }
      if (findNumDigits(prop) === false) {
        return new Error(
          `Invalid prop ${propName} supplied to ${componentName}. Number is too complicated`,
        )
      }
    },

    /** A slider can receive focus. */
    tabIndex: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),

    /** The HTML input value. */
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }

  static defaultProps = {
    min: 0,
    max: 10,
    increment: 1,
    smooth: false,
  }

  static autoControlledProps = [
    // TODO
  ]

  static _meta = _meta

  constructor(props) {
    super(props)

    const { min, max, lowerStart, upperStart } = this.props

    this.state = {
      lowerRoundVal: lowerStart ? this.roundToIncrement(lowerStart) : min,
      upperRoundVal: upperStart ? this.roundToIncrement(upperStart) : max,
    }
  }

  onStart = () => {
    const { upperRoundVal, lowerRoundVal } = this.state
    debug('startDrag')
    this.setState({
      ogLowerVal: lowerRoundVal,
      ogUpperVal: upperRoundVal,
    })
  }

  handleChange = (e, value) => {
    debug('handleChange()', value)
    _.invoke(this.props, 'onChange', e, value)
  }

  handleDrag = (e, d) => {
    const { ogLowerVal, ogUpperVal } = this.state
    const { lastX } = d
    const { classList } = d.node
    const val = this.scalePxToVal(lastX)

    debug('startDrag - px: ', lastX)
    debug('startDrag - val: ', val)

    if (
      (classList.contains(UPPER_BOUND) && val < ogLowerVal) ||
      (classList.contains(LOWER_BOUND) && val < ogUpperVal)
    ) {
      const rawVals = {
        lowerRawVal: val,
        upperRawVal: classList.contains(UPPER_BOUND) ? ogLowerVal : ogUpperVal,
      }
      const roundVals = {
        lowerRoundVal: this.roundToIncrement(rawVals.lowerRawVal),
        upperRoundVal: this.roundToIncrement(rawVals.upperRawVal),
      }
      this.handleChange(e, [roundVals.lowerRoundVal, roundVals.upperRoundVal])
      this.setState({
        ...rawVals,
        ...roundVals,
      })
    } else {
      const rawVals = {
        lowerRawVal: classList.contains(LOWER_BOUND) ? ogUpperVal : ogLowerVal,
        upperRawVal: val,
      }
      const roundVals = {
        lowerRoundVal: this.roundToIncrement(rawVals.lowerRawVal),
        upperRoundVal: this.roundToIncrement(rawVals.upperRawVal),
      }
      this.handleChange(e, [roundVals.lowerRoundVal, roundVals.upperRoundVal])
      this.setState({
        ...rawVals,
        ...roundVals,
      })
    }
  }

  /** isStop is treated as a boolean flag to trigger incrementRounding */
  onDrag = (e, d) => {
    debug('onDrag: ', d)
    this.handleDrag(e, d)
  }

  onStop = (e, d) => {
    debug('onStop: ', d)

    const { lowerRoundVal, upperRoundVal } = this.state

    const returnVals = [lowerRoundVal, upperRoundVal]

    const nullVals = {
      lowerRawVal: null,
      upperRawVal: null,
      ogLowerVal: null,
      ogUpperVal: null,
    }

    this.handleChange(e, returnVals)

    this.setState(nullVals)
  }

  roundToIncrement = (val) => {
    const { min, increment } = this.props

    if (!increment) return val

    const offset = floatModDiv(+min, +increment)

    return precisionRound((val - offset) / increment, 0) * increment + offset
  }

  // internal method
  scalePxToPct = (px) => {
    if (!this.innerNode) throw Error('this is being called before DOM is mounted!')

    const { width } = this.innerNode.getClientRects()[0]
    const { reversed } = this.props
    const boundPx = constrainNum(px, 0, width)

    const ret = precisionRound(1000 * boundPx / width / 10)

    return reversed ? invertPct(ret) : ret
  }

  scalePxToVal = (px) => {
    const { min, max } = this.props
    const pct = this.scalePxToPct(px)
    const val = (max - min) * (pct / 100) + min

    return precisionRound(val)
  }

  scaleValToPct = (val) => {
    const { min, max, reversed } = this.props
    const boundVal = constrainNum(val, min, max)

    const ret = precisionRound(100 * ((boundVal - min) / (max - min)))

    return reversed ? invertPct(ret) : ret
  }

  render() {
    const {
      className,
      disabled,
      // doubled,
      // doubleStart,
      id,
      label,
      // max,
      // min,
      // name,
      lower,
      upper,
      lowerStart,
      upperStart,
      reversed,
      smooth,
      // start,
      // increment,
      // tabIndex,
    } = this.props
    const { lowerRawVal, upperRawVal, lowerRoundVal, upperRoundVal } = this.state

    const handleSize = '1em'

    const lowerVal = smooth && !!lowerRawVal ? lowerRawVal : lowerRoundVal
    const upperVal = smooth && !!upperRawVal ? upperRawVal : upperRoundVal

    const lv = _.isNumber(lower) ? lower : lowerVal
    const uv = _.isNumber(upper) ? upper : upperVal

    const lowerPct = this.scaleValToPct(lv)
    const upperPct = this.scaleValToPct(uv)

    const fillLeft = `${reversed ? upperPct : lowerPct}%`
    const fillRight = `${reversed ? invertPct(lowerPct) : invertPct(upperPct)}%`

    const lowerHandleLeft = `calc(${lowerPct}% - calc(${handleSize} / 2))`
    const upperHandleLeft = `calc(${upperPct}% - calc(${handleSize} / 2))`

    const classes = cx(
      'ui',
      useKeyOnly(disabled, 'disabled'),
      // auto apply fitted class to compact white space when there is no label
      // https://semantic-ui.com/modules/slider.html#fitted
      useKeyOnly(_.isNil(label), 'fitted'),
      'slider',
      className,
    )

    const unhandled = getUnhandledProps(Slider, this.props)
    const ElementType = getElementType(Slider, this.props)
    const [htmlInputProps, rest] = partitionHTMLProps(unhandled, { htmlProps: htmlInputAttrs })

    const l = 'left'
    const r = 'right'

    const lowerHandle = () => (
      <DraggableCore
        axis='x' // TODO
        onDrag={this.onDrag}
        onStart={this.onStart}
        onStop={this.onStop}
      >
        <div
          className={`${LOWER_BOUND} thumb`}
          style={{
            [l]: lowerHandleLeft,
            [r]: 'auto',
          }}
        />
      </DraggableCore>
    )
    const upperHandle = () => (
      <DraggableCore
        axis='x' // TODO
        onDrag={this.onDrag}
        onStart={this.onStart}
        onStop={this.onStop}
      >
        <div
          className={`${UPPER_BOUND} thumb`}
          style={{
            [l]: upperHandleLeft,
            [r]: 'auto',
          }}
        />
      </DraggableCore>
    )
    const track = () => <div className='track' />
    const trackFill = () => (
      <div
        className='track-fill'
        style={{
          [l]: fillLeft,
          [r]: fillRight,
        }}
      />
    )

    const inner = () => (
      <div
        ref={(n) => {
          this.innerNode = n
        }}
        className='inner'
      >
        {track()}
        {trackFill()}
        {(lowerStart || lower) && lowerHandle()}
        {(upperStart || upper) && upperHandle()}
      </div>
    )

    return (
      <ElementType
        {...rest}
        className={classes}
        onClick={this.handleContainerClick}
        onChange={this.handleContainerClick}
        onMouseDown={this.handleMouseDown}
        {...htmlInputProps}
      >
        {inner()}
        {/*
         Heads Up!
         Do not remove empty labels, they are required by SUI CSS
         */}
        {createHTMLLabel(label, { defaultProps: { htmlFor: id } }) || <label htmlFor={id} />}
      </ElementType>
    )
  }
}
