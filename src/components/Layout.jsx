import Header from "./Header";
import Footer from "./Footer";
import FlashMessages from "./FlashMessages";

const Layout = ({ children }) => {
  return (
    <>
      <Header />
      <FlashMessages />
      <div className="container my-4">{children}</div>
      <Footer />
    </>
  );
};

export default Layout;
