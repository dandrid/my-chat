import React, { Component } from 'react';
import { Login } from './Login'
import { Main } from './Main'
import { proxy } from "./chat.d";


export default class App extends Component {

  state = { showLogin: true };

  componentDidMount() {
    proxy.addEventListener("login", () => this.setState({ showLogin: false }));
  }


  render() {
    return (
      <div className="app">
        {this.state.showLogin ? <Login /> : <Main />}
      </div>
    );
  }
}
