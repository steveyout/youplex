import { useContext, createContext } from 'react';

// ----------------------------------------------------------------------

export function withLoadingProps(loader) {
  const LoadingPropsContext = createContext({});

  const useLoadingProps = () => useContext(LoadingPropsContext);

  const DynamicComponent = loader(useLoadingProps);

  const WithLoadingPropsComponent = (props) => (
    <LoadingPropsContext.Provider value={props}>
      <DynamicComponent {...props} />
    </LoadingPropsContext.Provider>
  );

  return WithLoadingPropsComponent;
}
