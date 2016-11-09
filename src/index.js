import React from 'react';
import throttle from 'lodash.throttle';
import {findDOMNode} from 'react-dom';

const {PropTypes} = React;
const {span} = React.DOM;

const Status = {
  PENDING: 'pending',
  LOADING: 'loading',
  LOADED: 'loaded',
  FAILED: 'failed',
};

export default class ImageLoader extends React.Component {
  static propTypes = {
    wrapper: PropTypes.func,
    className: PropTypes.string,
    style: PropTypes.object,
    preloader: PropTypes.func,
    src: PropTypes.string,
    onLoad: PropTypes.func,
    onError: PropTypes.func,
    imgProps: PropTypes.object,
    triggered: PropTypes.bool,
    lazyLoad: PropTypes.bool,
  };

  static defaultProps = {
    wrapper: span,
    triggered: true,
    lazyLoad: false,
  };

  constructor(props) {
    super(props);
    console.log(props);
    this.state = {
      status: this.getStatus(),
      lazyLoad: props.lazyLoad,
    };
  }

  componentDidMount() {
    if (this.state.lazyLoad) {
      console.log('mounted with lazy load');
      window.addEventListener('scroll', this.updateOnViewport, false);
      window.addEventListener('resize', this.updateOnViewport, false);
      this.updateOnViewport();
    }

    if (this.state.status === Status.LOADING) {
      this.createLoader();
    }
  }

  removeLazyLoadingListeners() {
    console.log('removing listeners');
    window.removeEventListener('scroll', this.updateOnViewport);
    window.removeEventListener('resize', this.updateOnViewport);
  }

  updateOnViewport = throttle(() => {
    if (this.state.status !== Status.PENDING) return;

    const {
      top,
      height
    } = findDOMNode(this).getBoundingClientRect();

    if (top >= 0 && (top - height) <= window.innerHeight) {
      // this.removeLazyLoadingListeners();
      this.setState({status: Status.LOADING});
    }
  }, 300)

  componentWillReceiveProps(nextProps) {
    if (this.props.src !== nextProps.src) {
      this.setState({
        status: nextProps.src ? Status.LOADING : Status.PENDING,
      });
    } else if (this.props.triggered !== nextProps.triggered) {
      this.setState({
        status: this.getStatus(nextProps),
      });
    }
  }

  componentDidUpdate() {
    if (this.state.status === Status.LOADING && !this.img) {
      this.createLoader();
    }
  }

  componentWillUnmount() {
    this.destroyLoader();
    if (this.state.lazyLoad) {
      this.removeLazyLoadingListeners();
    }
  }

  getStatus(props = this.props) {
    const {src, triggered, lazyLoad} = props;
    return src && triggered && !lazyLoad ? Status.LOADING : Status.PENDING;
  }

  getClassName() {
    let className = `imageloader ${this.state.status}`;
    if (this.props.className) className = `${className} ${this.props.className}`;
    return className;
  }

  createLoader() {
    this.destroyLoader();  // We can only have one loader at a time.

    this.img = new Image();
    this.img.onload = ::this.handleLoad;
    this.img.onerror = ::this.handleError;
    this.img.src = this.props.src;
  }

  destroyLoader() {
    if (this.img) {
      this.img.onload = null;
      this.img.onerror = null;
      this.img = null;
    }
  }

  handleLoad(event) {
    this.destroyLoader();
    this.setState({status: Status.LOADED});

    if (this.props.onLoad) this.props.onLoad(event);
  }

  handleError(error) {
    this.destroyLoader();
    this.setState({status: Status.FAILED});

    if (this.props.onError) this.props.onError(error);
  }

  renderImg() {
    const {src, imgProps} = this.props;
    let props = {src};

    for (let k in imgProps) {
      if (imgProps.hasOwnProperty(k)) {
        props[k] = imgProps[k];
      }
    }

    return <img {...props} />;
  }

  render() {
    let wrapperProps = {
      className: this.getClassName(),
    };

    if (this.props.style) {
      wrapperProps.style = this.props.style;
    }

    let wrapperArgs = [wrapperProps];

    switch (this.state.status) {
      case Status.LOADED:
        wrapperArgs.push(this.renderImg());
        break;

      case Status.FAILED:
        if (this.props.children) wrapperArgs.push(this.props.children);
        break;

      default:
        if (this.props.preloader) wrapperArgs.push(this.props.preloader());
        break;
    }

    return this.props.wrapper(...wrapperArgs);
  }
}
