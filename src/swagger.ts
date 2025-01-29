import { Application } from 'express';
import swaggerJsDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'IMF Gadgets API',
            version: '1.0.0',
            description: 'API documentation for IMF Gadgets Management System',
        },
        servers: [
            {
                url: process.env.BASE_URL || 'http://localhost:3000',
                description: 'Development server',
            },
            {
                url: 'https://gadget-inventory-4qyd.onrender.com',
                description: 'Production server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            },
            schemas: {
                Gadget: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        codename: { type: 'string' },
                        description: { type: 'string' },
                        status: { type: 'string', enum: ['Active', 'Decommissioned', 'Destroyed'] },
                        decommissionedAt: { type: 'string', format: 'date-time', nullable: true },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                },
                CreateGadgetDto: {
                    type: 'object',
                    required: ['name', 'description'],
                    properties: {
                        name: { type: 'string' },
                        description: { type: 'string' }
                    }
                },
                UpdateGadgetDto: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        description: { type: 'string' }
                    }
                },
                SelfDestructConfirmationDto: {
                    type: 'object',
                    required: ['confirmationCode'],
                    properties: {
                        confirmationCode: { type: 'string', description: 'The confirmation code received from initiation' }
                    }
                },
                RegisterUserDto: {
                    type: 'object',
                    required: ['email', 'password', 'role'],
                    properties: {
                        email: { 
                            type: 'string', 
                            format: 'email',
                            description: 'User email address'
                        },
                        password: { 
                            type: 'string', 
                            format: 'password',
                            minLength: 8,
                            description: 'User password (minimum 8 characters)'
                        },
                        role: { 
                            type: 'string', 
                            enum: ['AGENT', 'ADMIN'],
                            description: 'User role'
                        }
                    }
                },
                LoginDto: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: { type: 'string', format: 'email' },
                        password: { type: 'string', format: 'password' }
                    }
                },
                AuthResponse: {
                    type: 'object',
                    properties: {
                        token: { type: 'string' },
                        user: {
                            type: 'object',
                            properties: {
                                id: { type: 'string', format: 'uuid' },
                                email: { type: 'string', format: 'email' },
                                role: { type: 'string', enum: ['AGENT', 'ADMIN'] }
                            }
                        }
                    }
                }
            }
        },
        paths: {
            '/api/auth/register': {
                post: {
                    tags: ['Auth'],
                    summary: 'Register a new user',
                    description: 'Create a new user account with the specified role',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/RegisterUserDto'
                                }
                            }
                        }
                    },
                    responses: {
                        '201': {
                            description: 'User registered successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            message: { 
                                                type: 'string',
                                                example: 'User registered successfully'
                                            },
                                            user: {
                                                type: 'object',
                                                properties: {
                                                    id: { 
                                                        type: 'string',
                                                        format: 'uuid'
                                                    },
                                                    email: { 
                                                        type: 'string',
                                                        format: 'email'
                                                    },
                                                    role: { 
                                                        type: 'string',
                                                        enum: ['AGENT', 'ADMIN']
                                                    },
                                                    createdAt: {
                                                        type: 'string',
                                                        format: 'date-time'
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        '400': {
                            description: 'Invalid input or email already exists',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            message: { 
                                                type: 'string',
                                                example: 'Email already exists'
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        '500': {
                            description: 'Server error'
                        }
                    }
                }
            },
            '/api/auth/login': {
        post: {
            tags: ['Auth'],
            summary: 'Login to the system',
            requestBody: {
                required: true,
                content: {
                    'application/json': {
                        schema: {
                            $ref: '#/components/schemas/LoginDto'
                        }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'Login successful',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/AuthResponse'
                            }
                        }
                    }
                },
                '401': {
                    description: 'Invalid credentials'
                },
                '500': {
                    description: 'Server error'
                }
            }
        }
    },
            '/api/gadgets': {
    get: {
        tags: ['Gadgets'],
        summary: 'Get all gadgets with optional status filter',
        security: [{ bearerAuth: [] }],
        parameters: [
            {
                name: 'status',
                in: 'query',
                required: false,
                schema: {
                    type: 'string',
                    enum: ['Active', 'Decommissioned', 'Destroyed']
                },
                description: 'Filter gadgets by status'
            }
        ],
        responses: {
            '200': {
                description: 'List of gadgets retrieved successfully',
                content: {
                    'application/json': {
                        schema: {
                            type: 'array',
                            items: {
                                $ref: '#/components/schemas/Gadget'
                            }
                        }
                    }
                }
            },
            '500': {
                description: 'Server error'
            }
        }
    },
                post: {
                    tags: ['Gadgets'],
                    summary: 'Create a new gadget',
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/CreateGadgetDto'
                                }
                            }
                        }
                    },
                    responses: {
                        '201': {
                            description: 'Gadget created successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/Gadget'
                                    }
                                }
                            }
                        },
                        '500': {
                            description: 'Server error'
                        }
                    }
                }
            },
            '/api/gadgets/{id}': {
                patch: {
                    tags: ['Gadgets'],
                    summary: 'Update a gadget',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: {
                                type: 'string',
                                format: 'uuid'
                            }
                        }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/UpdateGadgetDto'
                                }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Gadget updated successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        $ref: '#/components/schemas/Gadget'
                                    }
                                }
                            }
                        },
                        '404': {
                            description: 'Gadget not found'
                        },
                        '500': {
                            description: 'Server error'
                        }
                    }
                },
                delete: {
                    tags: ['Gadgets'],
                    summary: 'Decommission a gadget',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: {
                                type: 'string',
                                format: 'uuid'
                            }
                        }
                    ],
                    responses: {
                        '200': {
                            description: 'Gadget decommissioned successfully'
                        },
                        '404': {
                            description: 'Gadget not found'
                        },
                        '500': {
                            description: 'Server error'
                        }
                    }
                }
            },
            '/api/gadgets/{id}/self-destruct': {
                post: {
                    tags: ['Gadgets'],
                    summary: 'Initiate self-destruct sequence for a gadget',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: {
                                type: 'string',
                                format: 'uuid'
                            }
                        }
                    ],
                    responses: {
                        '200': {
                            description: 'Self-destruct sequence initiated successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            message: { type: 'string' },
                                            confirmationCode: { type: 'string' },
                                            expiresIn: { type: 'string' }
                                        }
                                    }
                                }
                            }
                        },
                        '400': {
                            description: 'Cannot self-destruct a decommissioned gadget'
                        },
                        '404': {
                            description: 'Gadget not found'
                        },
                        '500': {
                            description: 'Server error'
                        }
                    }
                }
            },
            '/api/gadgets/{id}/self-destruct/confirm': {
                post: {
                    tags: ['Gadgets'],
                    summary: 'Confirm and execute self-destruct sequence',
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        {
                            name: 'id',
                            in: 'path',
                            required: true,
                            schema: {
                                type: 'string',
                                format: 'uuid'
                            }
                        }
                    ],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/SelfDestructConfirmationDto'
                                }
                            }
                        }
                    },
                    responses: {
                        '200': {
                            description: 'Self-destruct sequence completed successfully',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            message: { type: 'string' },
                                            gadget: {
                                                $ref: '#/components/schemas/Gadget'
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        '400': {
                            description: 'Invalid confirmation code or sequence expired',
                            content: {
                                'application/json': {
                                    schema: {
                                        type: 'object',
                                        properties: {
                                            message: { type: 'string' },
                                            remainingAttempts: { 
                                                type: 'number',
                                                description: 'Number of remaining attempts before sequence abort'
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        '404': {
                            description: 'Gadget not found'
                        },
                        '500': {
                            description: 'Server error'
                        }
                    }
                }
            }
        }
        
    },
     
    apis: [
        './dist/controllers/*.js',  
        './src/controllers/*.ts',   
        './src/routes/*.ts',        
    ]
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

const setupSwagger = (app: Application): void => {
    
    app.use('/api-docs', (req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,authorization');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        next();
    });

    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs, {
        explorer: true,
        customSiteTitle: "IMF Gadgets API Documentation",
        swaggerOptions: {
            url: '/api-docs.json', 
            displayRequestDuration: true,
            persistAuthorization: true,
        }
    }));

    
    app.get('/api-docs.json', (req, res) => {
        res.json(swaggerDocs);
    });
};

export default setupSwagger;