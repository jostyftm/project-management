
export interface IApplicationPermissions {
  id: string
  type: string
  attributes: {
    id: string,
    name: string,
    display_name: string,
    module_id: string
  },
  relationships: {}
}

export interface IApplicationModules {
  id: number
  type: string
  attributes: {
    name: string,
    order: number,
    parent_id: number,
    path: string,
    is_active: string,
    display_sidebar: string,
    description: string
  },
  relationships: {
    permissions: IApplicationPermissions[]
  },
  childrens: [
    {}
  ]
}

export interface IApplication {
  id: number
  type: string
  attributes: {
    name: string
    description: string
    url: string
    avatar: string | null
    is_active: boolean
    module_count: number
    created_at: string
    updated_at: string
  },
  relationships: {
    modules: IApplicationModules[]
  }
}

export interface ApplicationLogin {
  description: string
  id: number
  name: string
  url: string
}
