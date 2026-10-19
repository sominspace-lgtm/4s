import { describe, it, expect } from 'vitest'
import { rowParts } from '@/components/notes/RowSendMenu'
import type { CollectionProp, CollectionRow } from '@/lib/hooks/useCollections'

const props: CollectionProp[] = [
  { id: 'a', name: 'Idea', type: 'text' },
  { id: 'b', name: 'Link', type: 'url' },
  { id: 'c', name: 'Budget', type: 'number' },
  { id: 'd', name: 'Done', type: 'checkbox' },
]
const row = (cells: CollectionRow['cells']): CollectionRow => ({ id: 'r', collection_id: 'c', cells, created_at: '' })

describe('rowParts', () => {
  it('takes the name, the link and the rest as notes', () => {
    expect(rowParts(props, row({ a: 'Pottery class', b: 'https://example.com/pottery', c: 40, d: false })))
      .toEqual({ title: 'Pottery class', url: 'https://example.com/pottery', notes: 'Budget: 40' })
  })
  it('ignores a link that is not a link', () => {
    expect(rowParts(props, row({ a: 'Picnic', b: 'somewhere', d: true }))).toEqual({ title: 'Picnic', url: null, notes: 'Link: somewhere\nDone: yes' })
  })
})
