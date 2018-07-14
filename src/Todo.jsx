import React, { Component } from 'react';
import { connect } from 'react-redux';
import Remarkable from 'remarkable';
import { GetGradientColor } from './common'

const markdown = new Remarkable()
// import * as actionCreators from './actionCreators'

// Action Creators

const todoExpand = (id) => {
    return {
        type: "TODO_TOGGLE_EXPAND",
        id: id,
    }
}

const todoEdit = (id) => {
    return {
        type: "TODO_EDIT",
        id: id,
    }
}

const todoSaveClient = (id, serverData) => {
    return {
        type: "TODO_SAVE",
        id: id,
        serverData: serverData
    }
}

const todoSaveError = (id) => {
    return {
        type: "TODO_SAVE_ERROR",
        id: id,
    }
}

// const todoAddConfirm = (data) => {
//     return {
//         type: "ADD_CONFIRM",
//         data: data
//     }
// }

// Components

const todoSave = (id, newData) => {
    console.log("calling todoSave",id,newData)
    if (id === null)
        return (dispatch) => {
            const data = new FormData();
            data.append( "descbody", newData.body )
            data.append( "title", newData.title )
            data.append( "priority", newData.priority )
            data.append( "color", newData.color )
            const reqInit = { method: "POST", body: data }
            return fetch("/api/todos", reqInit)
                .then(response => {
                    if(response.ok) {
                        response.json().then(data => {
                            const serverData = data.data
                            dispatch(todoSaveClient(null, serverData))
                        })
                    } else {
                        dispatch(todoSaveError(id))
                    }
                })
        }
    else
        return (dispatch) => {
            const data = new FormData();
            data.append( "descbody", newData.body )
            data.append( "title", newData.title )
            data.append( "priority", newData.priority )
            data.append( "color", newData.color )
            const reqInit = { method: "PUT", body: data }

            return fetch("/api/todos/"+id, reqInit)
                .then(response => {
                    if(response.ok) {
                        response.json().then(data => {
                            const serverData = data.data
                            dispatch(todoSaveClient(id, serverData))
                        })
                    } else {
                        dispatch(todoSaveError(id))
                    }
                })
        }
}

const todoDeleteClient = (id) => {
    return {
        type: 'TODO_DELETE',
        id: id
    }
}

const todoDelete = (id) => {
    return (dispatch) => {
            const data = new FormData();
            const reqInit = { method: "DELETE", body: data }

            return fetch("/api/todos/"+id, reqInit)
                .then(response => {
                    if(response.ok) {
                        dispatch(todoDeleteClient(id))
                    } else {
                        dispatch(todoSaveError(id))
                    }
                })
        }
}


function getXY(obj) {
    if (!obj) return [0,0];

    let left = 0
    let top = 0
    let pos//, lastLeft;
    if (obj.offsetParent) {
        do {
            //left += (lastLeft = obj.offsetLeft);
            left += obj.offsetLeft
            top += obj.offsetTop;
            pos = obj.style.position
            if (pos === 'fixed' || pos === 'absolute' || (pos === 'relative')) {
                left -= obj.scrollLeft;
                top -= obj.scrollTop;

            }
            obj = obj.offsetParent
        } while (obj)
    }
    return [left,top]
}


const MarkdownView = ({ source }) => {
    const mdhtml = { __html: markdown.render(source) }
    return (
        <div dangerouslySetInnerHTML={mdhtml}>
        </div>
    )
}

class ProgressBar extends Component {
    constructor(props) {
        super(props);

        this.min = 0
        this.max = 100

        this.barStyleBase = {
            "height": "100%",
            "width": "100%",
            "borderRadius": "3px",
            "background": "#aa0000",
            "position": "absolute",
            "bottom": "0px"
        }

        this.bgStyleBase = {
            "height": "100%",
            "width": "100%",
            "borderRadius": "3px",
            "background": "#660000",
            "position": "relative"
        }

        const orientation = this.props.orientation
        const attachPoint = this.props.attachPoint

        if (orientation === "vertical" && attachPoint === "top"){
            this.barStyleBase["bottom"] = ""
            this.barStyleBase["top"] = "0px"
            this.barStyleBase["left"] = "0px"
        } else {
            this.barStyleBase["bottom"] = "0px"
            this.barStyleBase["top"] = ""
            this.barStyleBase["left"] = "0px"
        }

        this.handleMouseDown = this.handleMouseDown.bind(this)
        this.handleMouseMove = this.handleMouseMove.bind(this)
        this.handleMouseUp = this.handleMouseUp.bind(this)
    }

    setValue(val) {
        var p = 100* val
        if (p>100) { p = 100 }
        if (p<0) { p = 0 }
        this.props.onChange(p)
    }

    barClick(e) {
        var el = this.dragElement // e.currentTarget
        var ex = el._globaloffsetX || getXY(el)[0]
        el._globaloffsetX = ex
        var val = e.clientX - ex
        var width = el.offsetWidth

        var p = val/width
        e.preventDefault()
        // console.log(val, width, p, ex)
        this.setValue(p)
        // var newcolor = GetGradientColor(p).substring(1) // strip leading #
        // sb.setColor(newcolor)
        // lt.find("input[name=priority]").val(parseInt(p*100))
    }

    handleMouseDown(event) {
        this.dragElement = event.currentTarget
        this.dragArea = this.dragElement.parentNode.parentNode.parentNode.parentNode
        this.barClick(event)
        this.dragArea.addEventListener('mousemove', this.handleMouseMove);
        this.dragArea.addEventListener('mouseup', this.handleMouseUp);
    }

    handleMouseMove(event) {
        return this.barClick(event)
    }

    handleMouseUp(event) {
        if (this.dragArea){
            this.dragArea.removeEventListener('mousemove', this.handleMouseMove);
            this.dragArea.removeEventListener('mouseup', this.handleMouseUp);
        }
        this.dragElement = null
    }

    componentWillUnmount() {
        return this.handleMouseUp()
    }

    render() {
        const { value, color } = this.props

        // const { dragArea } = this.props
        // this.dragArea = dragArea
        // console.log("new dragArea", dragArea)
        // var p = 100* ((val - this.min) / (this.max - this.min))
        // if (p>100) { p = 100 }
        // if (p<0) { p = 0 } // it looks ugly if any less
        // if (this.orientation == "horizontal") {
        //     $(this.bar).css("width", p+"%")
        // } else {
        //     $(this.bar).css("height", p+"%")
        // }
        const bgStyle = this.bgStyleBase
        const barStyle = Object.assign({}, this.barStyleBase, { width: value+"%" })


        return (
            <div className="priobar">
                <div draggable="true" className="background" style={bgStyle} onMouseDown={this.handleMouseDown}>
                    <div className="value" style={barStyle}></div>
                </div>
            </div>
        )
    }
}


// const Todo = ({ id, description, priority, title, onExpand, ...props }) => {
class Todo extends Component {
    constructor(props) {
        super(props);
        this.dispatch = this.props.dispatch
        this.state = {
            title: props.title,
            body: props.description,
            priority: props.priority,
            color: props.color
        };

        this.handleTitleChange = this.handleTitleChange.bind(this);
        this.handleBodyChange = this.handleBodyChange.bind(this);
        this.handleColorChange = this.handleColorChange.bind(this);
        this.handlePriorityChange = this.handlePriorityChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);

        this.handleMouseEnter = this.handleMouseEnter.bind(this);
        this.handleMouseLeave = this.handleMouseLeave.bind(this);
    }

    handleTitleChange(event) { this.setState({ title: event.target.value }) }
    handleColorChange(event) { this.setState({ color: event.target.value }) }
    handleBodyChange(event) { this.setState({ body: event.target.value }) }

    handlePriorityChange(newPrio) {
        this.setState({ priority: newPrio })
    }

    handleSubmit(event) {
        event.preventDefault();
        return this.props.onEditSubmit(this.state)
    }

    handleMouseEnter(event) {
        this.setState({ isHovering: true })
    }
    handleMouseLeave(event) {
        this.setState({ isHovering: false })
    }

    render() {
        const { id, description, priority, title } = this.props
        const { isExpanded, isEditing, color } = this.props
        const { onExpand, onEditClick, onDelete } = this.props

        const priorityColor = GetGradientColor(this.state.priority/100)
        // console.log("render todo", this.props)
        return (
            <div data-created="" className="listtask" onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave}>
                <form onSubmit={this.handleSubmit}>
                <div className="todopriority">
                    { this.state.isHovering && <div className="minus"></div> }
                    { this.state.isHovering && <div className="plus"></div> }
                    <span style={{ color: priorityColor }}>{ priority }</span>
                </div>
                { this.props.state === "ACTIVE" ? (
                    <div className="status_active"></div>
                ) : (
                    <div className="status_complete"></div>
                )}
                <div className="todotitle" onClick={ onExpand }>
                    { isEditing ? (
                        <input style={{color: '#'+color}} type="text" onChange={ this.handleTitleChange } name="title" value={this.state.title}></input>
                    ) : (
                        <span style={{color: '#'+color}}>{ title }</span>
                    )}
                </div>
                { (this.state.isHovering || isEditing) &&
                    <div className="buttons">
                        <div className="edit" onClick={onEditClick}></div>
                        <div className="complete"></div>
                        <div className="uncomplete"></div>
                        <div className="remove" onClick={onDelete}></div>
                    </div>
                }
                { isExpanded &&
                    <div className="exp">
                        { isEditing ? (
                            <div className="editpanel">
                                <textarea name="descbody" onChange={this.handleBodyChange} value={this.state.body}></textarea>
                                <div>
                                    <ProgressBar onChange={ this.handlePriorityChange } color="dynamic" value={this.state.priority}/>
                                    <div>
                                        <input className="color" type="text" name="color" onChange={ this.handleColorChange } value={this.state.color}></input>
                                        <a className="save" onClick={this.handleSubmit} >Save</a>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="descpanel">
                                <MarkdownView source={ description }/>
                            </div>
                        )}
                    </div>
                }
                </form>
            </div>
        )
    }
}


const EditableTodo = (props) => {
    return (
        <Todo {...props} />
    )
}

// Connecting

const mapDispatchToProps = (dispatch, props) => {
    return {
        dispatch,
        onExpand: () => {
            dispatch(todoExpand(props.id))
        },
        onEditClick: () => {
            dispatch(todoEdit(props.id))
        },
        onEditSubmit: (newData) => {
            dispatch(todoSave(props.id, newData))
        },

        onDelete: () => {
            dispatch(todoDelete(props.id))
        },
    }
}

export default connect(null, mapDispatchToProps)(EditableTodo)

