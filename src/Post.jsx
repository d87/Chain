import React, { Component } from 'react';
import { connect } from 'react-redux';
import Remarkable from 'remarkable';

const markdown = new Remarkable()
// import * as actionCreators from './actionCreators'

// Action Creators

const postEdit = (id) => {
    return {
        type: "EDIT",
        id: id,
    }
}

const postSaveClient = (id, newText) => {
    return {
        type: "SAVE",
        id: id,
        newText: newText
    }
}

const postSaveError = (id) => {
    console.log("enter postSaveError")
    return {
        type: "SAVE_ERROR",
        id: id,
    }
}

const postAddConfirm = (data) => {
    return {
        type: "ADD_CONFIRM",
        data: data
    }
}

const postEditCancel = (id) => {
    return {
        type: "EDIT_CANCEL",
        id: id,
    }
}

// Components

const postSave = (id, newText) => {
    console.log("enter postSave")
    console.log(newText)

    if (id === null)
        return (dispatch) => {
            const data = new FormData();
            data.append( "text", newText )
            const reqInit = { method: "POST", body: data }
            return fetch("/api/journal/add", reqInit)
                .then(response => {
                    if(response.ok) {
                        response.json().then(data => {
                            const postServerData = data.data
                            dispatch(postAddConfirm(postServerData))
                        })
                    } else {
                        dispatch(postSaveError(id))
                    }
                })
        }
    else
        return (dispatch) => {
            // const payload = { id: id, text: newText }
            const data = new FormData();
            // data.append( "json", JSON.stringify( payload ) );
            // data.append( "id", id )
            data.append( "text", newText )
            const reqInit = { method: "POST", body: data }

            return fetch("/api/journal/"+id+"/update", reqInit)
                .then(response => {
                    if(response.ok) {
                        dispatch(postSaveClient(id, newText))
                    } else {
                        dispatch(postSaveError(id))
                    }
                })
        }
}

const postDeleteClient = (id) => {
    return {
        type: 'DELETE',
        id: id
    }
}

const postDelete = (id) => {
    return (dispatch) => {
            const data = new FormData();
            const reqInit = { method: "POST", body: data }

            return fetch("/api/journal/"+id+"/delete", reqInit)
                .then(response => {
                    if(response.ok) {
                        dispatch(postDeleteClient(id))
                    } else {
                        dispatch(postSaveError(id))
                    }
                })
        }
}


const MarkdownView = ({ source }) => {
    const mdhtml = { __html: markdown.render(source) }
    return (
        <div dangerouslySetInnerHTML={mdhtml}>
        </div>
    )
}


const Post = ({ id, text, created_date, onEditClick }) => {
    return (
        <div>
                <MarkdownView source={text} />
                    <button className="btn btn-default btn-xs" onClick={onEditClick}>Edit</button>
                    <small className="pull-right">{created_date.toDateString()}</small>
        </div>
    )
}


class EditForm extends Component {
    constructor(props) {
        super(props);
        this.state = {value: props.text};

        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleChange(event) {
        this.setState({value: event.target.value});
    }

    handleSubmit(event) {
        event.preventDefault();
        return this.props.onEditSubmit(this.state.value)
    }

    render() {
        return(
            <div>
                <form onSubmit={this.handleSubmit}>
                    <textarea className="form-control" rows="10"
                        style={{resize: "vertical"}} name="posttext"
                        value={this.state.value} onChange={this.handleChange}> 
                    </textarea>
                    <div style={{ paddingLeft: "110px" }}>
                        <button type="submit" className="btn btn-success btn-margin">Save</button>
                        {this.props.id != null &&
                            <button type="button" className="btn btn-danger btn-margin" onClick={this.props.onDelete}>Delete</button>
                        }
                        <button type="button" className="btn btn-default btn-margin" onClick={this.props.onEditCancel}>Cancel</button>
                    </div>
                </form>
            </div>
        )
    }
}



const EditablePost = ({ isEditing, onSaveClick, ...props }) => {
    if(isEditing) {
        return(
            <EditForm {...props}/>
        )
    } else {
        return (
            <Post {...props} />
        )
    }
}


// Connecting


const mapDispatchToProps = (dispatch, props) => {
    return {
        onEditClick: () => {
            dispatch(postEdit(props.id))
        },
        onEditSubmit: (newText) => {
            dispatch(postSave(props.id, newText))
        },

        onEditCancel: (newText) => {
            dispatch(postEditCancel(props.id))
        },

        onDelete: () => {
            dispatch(postDelete(props.id))
        },
    }
}

export default connect(null, mapDispatchToProps)(EditablePost)

