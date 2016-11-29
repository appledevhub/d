// @flow

import React from 'react';
import { StatusBar } from 'react-native';
import { connect } from 'react-redux';

import Screen from '../components/Screen';
import ThemeProvider from '../components/ThemeProvider';
import { loadTheme } from '../reducers/config';
import type { State, ThemeObject } from '../utils/types';

type Props = {
  feed: Array,
  theme: ThemeObject,
};

const Page = ({ feed, theme }: Props) => (
  <ThemeProvider theme={theme}>
    <Screen />
  </ThemeProvider>
);

const mapStateToProps = ({ config }: State) => ({ theme: loadTheme(config) });

export default connect(mapStateToProps)(Page);