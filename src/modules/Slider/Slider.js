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
function precisionRound(number, precision) {
  const shift = (num, exponent) => {
    const numArray = `${num}`.split('e')
    return +`${numArray[0]}e${numArray[1] ? +numArray[1] + exponent : exponent}`
  }
  return shift(Math.round(shift(number, +precision)), -precision)
}

function constrainNum(num, min, max) {
  if (num < min) return min
  if (num > max) return max
  return num
}

function formatPctStr(num) {
  return `${num}%`
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

    /** A slider can have two handles and select a start and doubleStart */
    doubled: PropTypes.bool,

    /** The start value for the second handle in a doubled slider */
    doubleStart: PropTypes.number,

    /** Removes padding for a label. Auto applied when there is no label. */
    fitted: PropTypes.bool,

    /** A unique identifier. */
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),

    /** The text of the associated label element. */
    label: customPropTypes.itemShorthand,

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

    /** Precision for rounding - likely never set */
    precision: PropTypes.number,

    /** The handles can lock to the step location onMove or they can be smooth */
    smooth: PropTypes.bool,

    /** The start value for the primary handle in a slider */
    start: PropTypes.number,

    /** The value each slider step */
    step: PropTypes.number,

    /** A slider can receive focus. */
    tabIndex: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),

    /** The HTML input value. */
    value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }

  static defaultProps = {
    min: 0,
    max: 20,
    step: 1,
    start: 1,
    doubleStart: 0,
    smooth: false,
    precision: 1,
  }

  static autoControlledProps = [
    // TODO
  ]

  static _meta = _meta

  constructor(props) {
    super(props)
    const { start, doubleStart } = this.props
    this.state = {
      lowerVal: doubleStart,
      upperVal: start,
    }
  }

  onStart = () => {
    const { upperVal, lowerVal } = this.state
    debug('startDrag')
    this.setState({
      ogLowerVal: lowerVal,
      ogUpperVal: upperVal,
    })
  }

  handleChange = (e, value) => {
    debug('handleChange()', value)
    _.invoke(this.props, 'onChange', e, { ...this.props, value })
  }

  onDrag = (e, d) => {
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
      this.setState({
        lowerVal: val,
        upperVal: classList.contains(UPPER_BOUND) ? ogLowerVal : ogUpperVal,
      })
    } else {
      this.setState({
        upperVal: val,
        lowerVal: classList.contains(LOWER_BOUND) ? ogUpperVal : ogLowerVal,
      })
    }
  }

  onStop = (e, d) => {
    this.onDrag(e, d)
    this.setState({
      ogUpperVal: null,
      ogLowerVal: null,
    })
  }

  // internal method
  scalePxToPct = (px) => {
    if (!this.innerNode) throw Error('this is being called before DOM is mounted!')

    const { width } = this.innerNode.getClientRects()[0]
    const boundPx = constrainNum(px, 0, width)

    return Math.round(1000 * boundPx / width) / 10
  }

  scalePxToVal = (px) => {
    const { min, max, step } = this.props
    const pct = this.scalePxToPct(px)
    // const difference = step == 0 ? value : Math.round(value / step) * step

    const val = (max - min) * (pct / 100) + min

    return step === 0 ? precisionRound(val, 0) : precisionRound(val / step, 0) * step
  }

  scaleValToPct = (val) => {
    const { min, max, precision } = this.props
    const boundVal = constrainNum(val, min, max)

    return precisionRound(100 * ((boundVal - min) / (max - min)), precision)
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
      // smooth,
      // start,
      // step,
      // tabIndex,
    } = this.props
    const { lowerVal, upperVal } = this.state

    const handleSize = '1em'

    const lowerPct = formatPctStr(this.scaleValToPct(lowerVal))
    const upperPct = formatPctStr(this.scaleValToPct(upperVal))
    const fillLeft = lowerPct
    const fillRight = formatPctStr(100 - this.scaleValToPct(upperVal))

    const lowerHandleLeft = `calc(${lowerPct} - calc(${handleSize} / 2))`
    const upperHandleLeft = `calc(${upperPct} - calc(${handleSize} / 2))`

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
            left: lowerHandleLeft,
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
            left: upperHandleLeft,
          }}
        />
      </DraggableCore>
    )
    const track = () => <div className='track' />
    const trackFill = () => (
      <div
        className='track-fill'
        style={{
          left: fillLeft,
          right: fillRight,
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
        {lowerHandle()}
        {upperHandle()}
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
