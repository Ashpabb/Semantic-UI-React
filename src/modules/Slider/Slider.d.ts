import * as React from 'react';
import { HtmlLabelProps, SemanticShorthandItem } from '../..';

export interface SliderProps {
  [key: string]: any;

  /** An element type to render as (string or function). */
  as?: any;

  /** Whether or not slider is checked. */
  checked?: boolean;

  /** Additional classes. */
  className?: string;

  /** A slider can appear disabled and be unable to change states */
  disabled?: boolean;

  /** A slider can have two handles and select a start and doubleStart */
  doubled?: boolean;

  /** The start value for the second handle in a doubled slider */
  doubleStart?: number;

  /** Removes padding for a label. Auto applied when there is no label. */
  fitted?: boolean;

  /** A unique identifier. */
  id?: number | string;

  /** Whether or not slider is indeterminate. */
  indeterminate?: boolean;

  /** The text of the associated label element. */
  label?: SemanticShorthandItem<HtmlLabelProps>;

  /** The maximum value for the slider range */
  max?: number;

  /** The minimum value for the slider range */
  min?: number;

  /** The HTML input name. */
  name?: string;

  /** The handles can lock to the step location onMove or they can be smooth */
  smooth?: boolean;

  /** The start value for the primary handle in a slider */
  start?: number;

  /** The value each slider step */
  step?: number;

  /** Whether of not slider is vertical */
  vertical?: boolean;

  /**
   * Called when the user attempts to change the checked state.
   *
   * @param {SyntheticEvent} event - React's original SyntheticEvent.
   * @param {object} data - All props and proposed checked/indeterminate state.
   */
  onChange?: (event: React.FormEvent<HTMLInputElement>, data: SliderProps) => void;

  /**
   * Called when the slider or label is clicked.
   *
   * @param {SyntheticEvent} event - React's original SyntheticEvent.
   * @param {object} data - All props and current checked/indeterminate state.
   */
  onMove?: (event: React.MouseEvent<HTMLInputElement>, data: SliderProps) => void;

  /**
   * Called when the user presses down on the mouse.
   *
   * @param {SyntheticEvent} event - React's original SyntheticEvent.
   * @param {object} data - All props and current checked/indeterminate state.
   */
  onMouseDown?: (event: React.MouseEvent<HTMLInputElement>, data: SliderProps) => void;

  /** A slider can receive focus. */
  tabIndex?: number | string;

  /** The HTML input value. */
  value?: number | string;
}

declare const Slider: React.ComponentClass<SliderProps>;

export default Slider;
