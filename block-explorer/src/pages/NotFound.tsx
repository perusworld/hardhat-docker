import { Button, Result } from 'antd'
import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <Result
      status="404"
      title="Page not found"
      subTitle="That explorer route does not exist."
      extra={
        <Button type="primary">
          <Link to="/">Back to dashboard</Link>
        </Button>
      }
    />
  )
}
