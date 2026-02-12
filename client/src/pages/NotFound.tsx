import { Link } from 'react-router-dom';
import { SEO } from '../components/SEO';

export default function NotFound() {
  return (
    <>
      <SEO title="Page Not Found" description="The page you're looking for doesn't exist. Return to Silvera PH homepage." />
      <div className="container-custom py-16 text-center">
        <h1 className="text-6xl font-bold text-txt-tertiary mb-4">404</h1>
        <h2 className="section-title">Page Not Found</h2>
        <p className="text-txt-secondary mb-8">The page you're looking for doesn't exist.</p>
        <Link to="/" className="btn-primary">Go Home</Link>
      </div>
    </>
  );
}
