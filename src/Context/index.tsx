import * as React  from "react";

export const GameContext = React.createContext();

function reducer(state, action) {
  switch (action.type) {
    case 'next':
      return {count: state.count + 1};
    default:
      throw new Error();
  }
}
export const GameProviderWrapper = ({ children }) => {
  const [state, dispatch] = React.useReducer(reducer, { count: 0 });

  return (
    <GameContext.Provider value={{ ...state, dispatch }}>{children}</GameContext.Provider>
  );
}
