import { Pagination, Space, Typography } from 'antd'
import { useState } from 'react'
import BlockTable from '../components/BlockTable'
import { useLatestBlocks } from '../hooks/useExplorerQueries'
import { formatInteger } from '../lib/format'

const pageSize = 12

export default function BlocksPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading } = useLatestBlocks(page, pageSize)

  return (
    <Space direction="vertical" size={18} className="page-stack">
      <div className="page-heading">
        <div>
          <Typography.Title level={2}>Blocks</Typography.Title>
          <Typography.Text type="secondary">
            {data ? `${formatInteger(data.latest + 1)} total blocks indexed from the local chain.` : 'Loading block height.'}
          </Typography.Text>
        </div>
      </div>
      <BlockTable blocks={data?.blocks} loading={isLoading} />
      <Pagination
        current={page}
        pageSize={pageSize}
        total={(data?.latest ?? 0) + 1}
        showSizeChanger={false}
        align="end"
        onChange={setPage}
      />
    </Space>
  )
}
