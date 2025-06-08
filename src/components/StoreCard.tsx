import { Link } from 'react-router-dom'

export default function StoreCard() {
  return (
    <Link to="/store/test-store-1">
      <div>
        <h3>Sample Store</h3>
        <p>Description goes here</p>
      </div>
    </Link>
  )
} 