import React from 'react';
import { connect } from 'react-redux';
import EditablePost from './Post';

const postAdd = () => {
    return {
        type: 'ADD'
    }
}


// Reducer

const postReducer = (state = {}, action) => {
    switch (action.type) {
        case 'INIT': {
            return action.newState
        }
        case 'ADD':  {
            for (const post of state) {
                if (post.id === null)
                    return state;
            }
            return [
                {
                    id: null,
                    text: "",
                    isEditing: true,
                    created_date: Date.now()
                },
                ...state
            ]
        }
        case 'ADD_CONFIRM':{
            return state.map(post => {
                if (post.id === null)
                    return Object.assign({}, post,
                        {
                            id: action.data.id,
                            isEditing: false,
                            text: action.data.text,
                            created_date: new Date(action.data.created_date)
                        });
                else return post
                })
        }
        case 'EDIT_CANCEL':{
            if (action.id === null)
                return state.filter(post => {
                    return post.id != null;
                })
            else
                return state.map(post => {
                    if (post.id === action.id)
                        return Object.assign({}, post, { isEditing: false });
                    else return post
                    })
        }
        case 'EDIT': {
            return state.map(post => {
                if (post.id === action.id)
                    return Object.assign({}, post, { isEditing: true });
                else return post
                })
        }
        case 'SAVE': {
            return state.map(post => {
                if (post.id === action.id)
                    return Object.assign({}, post, { isEditing: false, text: action.newText });
                else return post
                })
        }
        case 'DELETE': {
            return state.filter(post => {
                    return post.id !== action.id;
                })
        }

        default: return state || [];
    }
}



// Components

const Journal = ({ posts, onAddClick }) => {
    console.log(posts)
    return (
        <div className="row journal">
            <div className="col-sm-12">
                <button className="btn btn-primary btn-margin" onClick={onAddClick}>New Entry</button>
            </div>
            {posts.map(post =>
                <div key={post.id} className="col-sm-4">
                    <div className="well">
                        <EditablePost {...post}/>
                    </div>
                </div>
            )}
        </div>
    )
}

// Connecting

const mapStateToProps = (state, props) => { //that's container existing props
    return {
        posts: state.posts
    }
}

const mapDispatchToProps = (dispatch) => { //that's container existing props
    return {
        onAddClick: () => {
            dispatch(postAdd())
        }
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(Journal)
export { postReducer }