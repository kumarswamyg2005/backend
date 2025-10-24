import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import mensCollectionBanner from "../assets/images/mens-collection-banner.webp";
import womensCollectionBanner from "../assets/images/womens-collection-banner.webp";
import sustainableFabric from "../assets/images/sustainable fabric.webp";
import customEmbroidery from "../assets/images/Custom Embroidery.jpg";

const Home = () => {
  const { user } = useAuth();

  return (
    <>
      <div className="hero-section text-center py-5 mb-5">
        <div className="container">
          <h1 className="display-4 fw-bold">Design Your Dream Clothing</h1>
          <p className="lead mb-4">
            Create custom designs, choose your fabrics, colors, and patterns.
            We'll bring your vision to life.
          </p>
          <div className="d-grid gap-2 d-sm-flex justify-content-sm-center">
            <Link
              to={user ? "/customer/design-studio" : "/signup"}
              className="btn btn-primary btn-lg px-4 gap-3"
            >
              Get Started
            </Link>
            <a
              href="#features"
              className="btn btn-outline-secondary btn-lg px-4"
            >
              Learn More
            </a>
          </div>
        </div>
      </div>

      <div id="features" className="features-section py-5">
        <div className="container">
          <h2 className="text-center mb-5">How It Works</h2>
          <div className="row g-4">
            <div className="col-md-4">
              <div className="card h-100 shadow-sm">
                <div className="card-body text-center">
                  <i className="fas fa-pencil-ruler fa-3x text-primary mb-3"></i>
                  <h3 className="card-title">Design</h3>
                  <p className="card-text">
                    Use our interactive design studio to create your perfect
                    clothing item. Choose fabrics, colors, and patterns.
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card h-100 shadow-sm">
                <div className="card-body text-center">
                  <i className="fas fa-tshirt fa-3x text-primary mb-3"></i>
                  <h3 className="card-title">Order</h3>
                  <p className="card-text">
                    Place your order with just a few clicks. Our system will
                    assign your design to one of our skilled tailors.
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card h-100 shadow-sm">
                <div className="card-body text-center">
                  <i className="fas fa-truck fa-3x text-primary mb-3"></i>
                  <h3 className="card-title">Receive</h3>
                  <p className="card-text">
                    Track your order as it's being made. Once completed, your
                    custom clothing will be delivered to your doorstep.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="shop-section py-5 bg-light">
        <div className="container">
          <div className="text-center mb-5">
            <h2>Shop Ready-Made Designs</h2>
            <p className="lead">
              Browse our collection of pre-designed clothing for men and women
            </p>
          </div>
          <div className="row g-4 mb-4">
            <div className="col-md-6">
              <div className="card h-100 overflow-hidden">
                <div className="position-relative">
                  <img
                    src={mensCollectionBanner}
                    className="img-fluid w-100"
                    alt="Men's Collection"
                  />
                  <div className="position-absolute bottom-0 start-0 p-4">
                    <Link
                      to="/shop?gender=Men"
                      className="btn btn-light btn-lg"
                    >
                      Shop Men
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card h-100 overflow-hidden">
                <div className="position-relative">
                  <img
                    src={womensCollectionBanner}
                    className="img-fluid w-100"
                    alt="Women's Collection"
                  />
                  <div className="position-absolute bottom-0 start-0 p-4">
                    <Link
                      to="/shop?gender=Women"
                      className="btn btn-light btn-lg"
                    >
                      Shop Women
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="trending-section py-5">
        <div className="container">
          <h2 className="text-center mb-5">Latest Trends</h2>
          <div className="row g-4">
            <div className="col-md-3">
              <div className="card h-100">
                <img
                  src={sustainableFabric}
                  className="card-img-top"
                  alt="Sustainable Fabrics"
                />
                <div className="card-body">
                  <h5 className="card-title">Sustainable Fabrics</h5>
                  <p className="card-text">
                    Eco-friendly materials that look good and feel great.
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card h-100">
                <img
                  src="https://cdn.vectorstock.com/i/1000v/63/42/graphic-geometric-bold-lines-seamless-pattern-vector-46396342.jpg"
                  className="card-img-top"
                  alt="Bold Patterns"
                />
                <div className="card-body">
                  <h5 className="card-title">Bold Patterns</h5>
                  <p className="card-text">
                    Stand out with eye-catching geometric designs.
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card h-100">
                <img
                  src="https://www.trendstop.com/wp-content/uploads/2021/05/13macrotheme1-920x600-c-default.jpg"
                  className="card-img-top"
                  alt="Vintage Revival"
                />
                <div className="card-body">
                  <h5 className="card-title">Vintage Revival</h5>
                  <p className="card-text">
                    Classic styles reimagined for the modern wardrobe.
                  </p>
                </div>
              </div>
            </div>
            <div className="col-md-3">
              <div className="card h-100">
                <img
                  src={customEmbroidery}
                  className="card-img-top"
                  alt="Custom Embroidery"
                />
                <div className="card-body">
                  <h5 className="card-title">Custom Embroidery</h5>
                  <p className="card-text">
                    Personalized details that make your clothing unique.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="testimonials-section py-5 bg-light">
        <div className="container">
          <h2 className="text-center mb-5">What Our Customers Say</h2>
          <div className="row g-4">
            <div className="col-md-4">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <div className="d-flex mb-3">
                    <div className="text-warning">
                      {[...Array(5)].map((_, i) => (
                        <i key={i} className="fas fa-star"></i>
                      ))}
                    </div>
                  </div>
                  <p className="card-text">
                    &quot;The quality of my custom shirt exceeded my
                    expectations. The fabric is premium and the fit is
                    perfect!&quot;
                  </p>
                  <div className="d-flex align-items-center">
                    <div className="ms-3">
                      <h6 className="mb-0">John D.</h6>
                      <small className="text-muted">Customer since 2022</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <div className="d-flex mb-3">
                    <div className="text-warning">
                      {[...Array(4)].map((_, i) => (
                        <i key={i} className="fas fa-star"></i>
                      ))}
                      <i className="fas fa-star-half-alt"></i>
                    </div>
                  </div>
                  <p className="card-text">
                    &quot;The design studio is so intuitive! I created a dress
                    exactly how I imagined it, and the final product was
                    stunning.&quot;
                  </p>
                  <div className="d-flex align-items-center">
                    <div className="ms-3">
                      <h6 className="mb-0">Sarah M.</h6>
                      <small className="text-muted">Customer since 2023</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <div className="d-flex mb-3">
                    <div className="text-warning">
                      {[...Array(5)].map((_, i) => (
                        <i key={i} className="fas fa-star"></i>
                      ))}
                    </div>
                  </div>
                  <p className="card-text">
                    &quot;I ordered custom shirts for my entire team. The
                    process was smooth, and everyone loves their personalized
                    clothing!&quot;
                  </p>
                  <div className="d-flex align-items-center">
                    <div className="ms-3">
                      <h6 className="mb-0">Michael T.</h6>
                      <small className="text-muted">Customer since 2021</small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
